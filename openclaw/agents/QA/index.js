'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, 'agent.json'), 'utf8'));

const ALLOWED_MODES = new Set(MANIFEST.policies.autoConfirm.modes);
const DEFAULT_MODE = MANIFEST.policies.autoConfirm.default;
const SAFE = MANIFEST.policies.safePatch;
const SAFE_FIXED_RE = SAFE.enabled ? new RegExp(SAFE.requireFixedCodePattern) : null;
const SAFE_DENY_RE = SAFE.enabled ? new RegExp(SAFE.denyPathPattern) : null;
const EV = MANIFEST.events;
const MSG = MANIFEST.messages;

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
    if (!SAFE_FIXED_RE.test(finding.fixedCode)) return false;
    if (!SAFE.allowedSeverities.includes(finding.severity)) return false;
    if (SAFE_DENY_RE.test(finding.file || '')) return false;
    return true;
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
        runId, targetDir, findingsCount: findings.length, mode: autoConfirm, startedAt,
    });

    const { auto, interactive } = partitionFindings(findings, autoConfirm);

    findings.forEach((f, i) => emit(onEvent, EV.finding, { runId, index: i, finding: f }));

    const aggregate = { healed: 0, total: findings.length, score: 0, reportFile: null, logFile: null };

    try {
        if (auto.length > 0) {
            const PatchAgent = require(path.resolve(__dirname, '..', '..', '..', 'src', 'agents', 'patch_agent'));
            const patched = await new PatchAgent(targetDir).run(auto);
            aggregate.healed += patched;
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
