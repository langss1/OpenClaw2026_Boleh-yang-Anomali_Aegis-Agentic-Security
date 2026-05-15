'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, 'agent.json'), 'utf8'));

const EV = MANIFEST.events;
const MSG = MANIFEST.messages;

function fmt(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function generateRunId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return crypto.randomBytes(16).toString('hex');
}

function emit(onEvent, type, payload) {
    if (typeof onEvent !== 'function') return;
    try { onEvent({ type, ...payload, ts: new Date().toISOString() }); }
    catch (_) { /* gateway */ }
}

function loadSecuritySkill() {
    const skillEntry = MANIFEST.skills.find((s) => s.name === 'SecurityCode');
    if (!skillEntry) throw new Error('[SECURITYCODE AGENT] Manifest tidak mencantumkan skill SecurityCode.');
    const skillPath = path.resolve(__dirname, skillEntry.path);
    return require(skillPath);
}

async function runSecurityCodeAgent({ targetDir, onEvent } = {}) {
    if (!targetDir || typeof targetDir !== 'string') {
        throw new Error(MSG.errorTargetDirMissing);
    }
    const resolved = path.resolve(targetDir);
    if (!fs.existsSync(resolved)) {
        throw new Error(fmt(MSG.errorTargetDirNotFound, { targetDir: resolved }));
    }

    const { runSecurityCodeSkill } = loadSecuritySkill();
    const runId = generateRunId();
    emit(onEvent, EV.start, { runId, targetDir: resolved });

    try {
        const result = await runSecurityCodeSkill({ targetDir: resolved });
        const findings = result.findings || [];

        findings.forEach((f, index) => {
            emit(onEvent, EV.finding, { runId, index, finding: f });
        });

        emit(onEvent, EV.complete, {
            runId,
            total: findings.length,
            summary: result.summary || {},
            reportFile: result.reportFile,
        });

        return {
            runId,
            findings,
            reportFile: result.reportFile,
            logFile: result.logFile,
            summary: result.summary || {},
        };
    } catch (err) {
        emit(onEvent, EV.error, { runId, message: err.message, stack: err.stack });
        throw err;
    }
}

module.exports = { runSecurityCodeAgent, _manifest: MANIFEST };
