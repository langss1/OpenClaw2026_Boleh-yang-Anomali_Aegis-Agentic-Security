'use strict';

const path = require('path');
const fs = require('fs');

const MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, 'skill.json'), 'utf8'));
const MSG = MANIFEST.messages;
const PROTO = MANIFEST.protocols;
const IMPL = MANIFEST.implementation;

const { createRunLogger } = require('./logger');

function fmt(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function loadModuleHandler() {
    const modulePath = path.resolve(__dirname, IMPL.modulePath);
    const mod = require(modulePath);
    const handler = mod[IMPL.moduleHandler];
    if (typeof handler !== 'function') {
        throw new Error(`[SECURITYCODE SKILL] Handler "${IMPL.moduleHandler}" tidak ditemukan di ${IMPL.modulePath}`);
    }
    return handler;
}

function summarizeFindings(findings) {
    const out = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const f of findings) {
        const s = f.severity;
        if (s in out) out[s] += 1;
    }
    return out;
}

async function runSecurityCodeSkill({ targetDir } = {}) {
    if (!targetDir || typeof targetDir !== 'string') {
        throw new Error(MSG.errorTargetDirMissing);
    }
    if (!fs.existsSync(targetDir)) {
        throw new Error(fmt(MSG.errorTargetDirNotFound, { targetDir }));
    }

    const log = createRunLogger(targetDir, {
        logDir: PROTO.logDir,
        filePrefix: PROTO.logFilePrefix,
        fileExtension: PROTO.logFileExtension,
    });

    log.section('SECURITYCODE SKILL RUN START');
    log.info(`targetDir: ${targetDir}`);

    const runSecurity = loadModuleHandler();
    let findings;
    try {
        findings = await runSecurity(targetDir);
    } catch (err) {
        log.error(`runSecurity gagal: ${err.message}`);
        log.section('SECURITYCODE SKILL RUN END (ERROR)');
        throw err;
    }

    if (!Array.isArray(findings)) findings = [];

    const summary = summarizeFindings(findings);
    log.section('Findings');
    log.info(`total: ${findings.length}`);
    log.info(`summary: ${JSON.stringify(summary)}`);
    findings.forEach((f, i) => {
        log.info(`#${i + 1} ${f.severity || '?'} ${f.issue || '?'} @ ${f.file}:${f.line}`);
    });

    log.section('SECURITYCODE SKILL RUN END');
    console.log(`\x1b[90m${fmt(MSG.infoLogStored, { logFile: log.relativePath() })}\x1b[0m`);

    return {
        findings,
        reportFile: PROTO.report,
        logFile: log.relativePath(),
        summary,
    };
}

module.exports = { runSecurityCodeSkill, _manifest: MANIFEST };
