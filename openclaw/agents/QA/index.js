'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, 'agent.json'), 'utf8'));

const ALLOWED_MODES = new Set(MANIFEST.policies.autoConfirm.modes);
const DEFAULT_MODE = MANIFEST.policies.autoConfirm.default;
const SAFE = MANIFEST.policies.safePatch;
const SAFE_DENY_RE = SAFE.enabled && SAFE.denyPathPattern
    ? new RegExp(SAFE.denyPathPattern)
    : null;
const SAFE_ALLOWED_ISSUES = SAFE.enabled && SAFE.allowedIssues
    ? new Set(SAFE.allowedIssues)
    : null;
const EV = MANIFEST.events;
const MSG = MANIFEST.messages;

const QA_SKILL_ENTRY = MANIFEST.skills.find((s) => s.name === 'QA');
const QA_SKILL_MANIFEST = QA_SKILL_ENTRY
    ? JSON.parse(fs.readFileSync(path.join(path.resolve(__dirname, QA_SKILL_ENTRY.path), 'skill.json'), 'utf8'))
    : null;
const QA_REPORT_PATH = QA_SKILL_MANIFEST?.protocols?.report || 'logs/QA/REPORT_Quality_Code.md';

function fmt(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function loadQASkill() {
    const skillEntry = MANIFEST.skills.find(s => s.name === 'QA');
    if (!skillEntry) throw new Error('[QA AGENT] Manifest tidak mencantumkan skill QA.');
    const skillPath = path.resolve(__dirname, skillEntry.path);
    return require(skillPath);
}

function generateRunId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return crypto.randomBytes(16).toString('hex');
}

function emit(onEvent, type, payload) {
    if (typeof onEvent !== 'function') return;
    try { onEvent({ type, ...payload, ts: new Date().toISOString() }); }
    catch (_) { /* listener gateway tidak boleh mematikan agent */ }
}

function isSafePatch(finding) {
    if (!SAFE.enabled) return false;
    if (!finding || typeof finding.fixedCode !== 'string') return false;
    if (SAFE.requireCategory && finding.category !== SAFE.requireCategory) return false;
    if (SAFE.allowedSeverities && !SAFE.allowedSeverities.includes(finding.severity)) return false;
    if (SAFE_ALLOWED_ISSUES && !SAFE_ALLOWED_ISSUES.has(finding.issue)) return false;
    if (SAFE_DENY_RE && SAFE_DENY_RE.test(finding.file || '')) return false;
    return true;
}

function filterQualityFindings(findings) {
    return findings.filter((f) => !f.category || f.category === 'quality');
}

function partitionFindings(findings, mode) {
    if (mode === 'all') return { auto: [...findings], interactive: [] };
    if (mode === 'never') return { auto: [], interactive: [...findings] };
    const auto = [];
    const interactive = [];
    for (const f of findings) (isSafePatch(f) ? auto : interactive).push(f);
    return { auto, interactive };
}

async function runQAAgent({ targetDir, findings, autoConfirm = DEFAULT_MODE, onEvent } = {}) {
    if (!targetDir) throw new Error(MSG.errorTargetDirMissing);
    if (!Array.isArray(findings)) throw new Error(MSG.errorFindingsInvalid);

    const qualityFindings = filterQualityFindings(findings);
    if (findings.length > 0 && qualityFindings.length === 0) {
        throw new Error('[QA AGENT] Temuan bukan ranah QA (kualitas). Gunakan SecurityCode untuk isu keamanan.');
    }

    if (!ALLOWED_MODES.has(autoConfirm)) {
        throw new Error(fmt(MSG.errorAutoConfirmInvalid, {
            value: autoConfirm,
            modes: [...ALLOWED_MODES].join(', '),
        }));
    }
    if (!fs.existsSync(targetDir)) {
        throw new Error(fmt(MSG.errorTargetDirNotFound, { targetDir }));
    }

    const { runQASkill } = loadQASkill();
    const runId = generateRunId();
    const startedAt = new Date().toISOString();

    emit(onEvent, EV.start, {
        runId, targetDir, findingsCount: qualityFindings.length, mode: autoConfirm, startedAt,
    });

    const { auto, interactive } = partitionFindings(qualityFindings, autoConfirm);

    qualityFindings.forEach((f, i) => emit(onEvent, EV.finding, { runId, index: i, finding: f }));

    const aggregate = { healed: 0, total: qualityFindings.length, score: 0, reportFile: null, logFile: null };

    try {
        if (auto.length > 0) {
            const PatchAgent = require(path.resolve(__dirname, '..', '..', '..', 'src', 'agents', 'patch_agent'));
            const patched = await new PatchAgent(targetDir).run(auto, { reportPath: QA_REPORT_PATH });
            aggregate.healed += patched;
            if (patched > 0) aggregate.reportFile = QA_REPORT_PATH;
            auto.forEach((f, idx) => emit(onEvent, EV.patchApplied, {
                runId, index: idx, file: f.file, line: f.line, mode: 'auto',
            }));
        }

        if (interactive.length > 0) {
            const skillResult = await runQASkill({ targetDir, findings: interactive });
            aggregate.healed += skillResult.healed;
            aggregate.reportFile = skillResult.reportFile || aggregate.reportFile;
            aggregate.logFile = skillResult.logFile || aggregate.logFile;
        }

        aggregate.score = aggregate.total === 0 ? 100
            : Math.round((aggregate.healed / aggregate.total) * 100);

        emit(onEvent, EV.complete, {
            runId, healed: aggregate.healed, total: aggregate.total, score: aggregate.score,
        });

        return { runId, ...aggregate };
    } catch (err) {
        emit(onEvent, EV.error, { runId, message: err.message, stack: err.stack });
        throw err;
    }
}

module.exports = { runQAAgent, _manifest: MANIFEST };
