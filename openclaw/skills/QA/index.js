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
        throw new Error(`[QA SKILL] Handler "${IMPL.moduleHandler}" tidak ditemukan di ${IMPL.modulePath}`);
    }
    return handler;
}

async function runQASkill({ targetDir, findings } = {}) {
    if (!targetDir || typeof targetDir !== 'string') {
        throw new Error(MSG.errorTargetDirMissing);
    }
    if (!fs.existsSync(targetDir)) {
        throw new Error(fmt(MSG.errorTargetDirNotFound, { targetDir }));
    }
    if (!Array.isArray(findings)) {
        throw new Error(MSG.errorFindingsInvalid);
    }

    const qualityFindings = findings.filter((f) => !f.category || f.category === 'quality');
    if (findings.length > 0 && qualityFindings.length === 0) {
        throw new Error('[QA SKILL] Temuan bukan ranah QA. Gunakan SecurityCode untuk isu keamanan.');
    }

    const log = createRunLogger(targetDir, {
        logDir: PROTO.logDir,
        filePrefix: PROTO.logFilePrefix,
        fileExtension: PROTO.logFileExtension,
    });

    log.section('QA SKILL RUN START');
    log.info(`targetDir: ${targetDir}`);
    log.info(`findingsCount: ${qualityFindings.length} (quality)`);

    if (qualityFindings.length === 0) {
        console.log(`\x1b[32m${MSG.infoEmptyFindings}\x1b[0m`);
        log.info('Tidak ada finding. Skill keluar tanpa perubahan.');
        log.section('QA SKILL RUN END');
        return { healed: 0, total: 0, score: 100, reportFile: null, logFile: log.relativePath() };
    }

    log.section('Findings');
    qualityFindings.forEach((f, i) => {
        log.info(`#${i + 1} ${f.severity || '?'} ${f.issue || '?'} @ ${f.file}:${f.line}`);
    });

    const runQA = loadModuleHandler();

    let result;
    try {
        result = (await runQA(targetDir, qualityFindings)) || { healed: 0, total: qualityFindings.length, score: 0 };
    } catch (err) {
        log.error(`runQA gagal: ${err.message}`);
        log.section('QA SKILL RUN END (ERROR)');
        throw err;
    }

    log.section('Result');
    log.info(`healed: ${result.healed}/${result.total} (score ${result.score}/100)`);
    log.section('QA SKILL RUN END');

    console.log(`\x1b[90m${fmt(MSG.infoLogStored, { logFile: log.relativePath() })}\x1b[0m`);

    return {
        healed: result.healed,
        total: result.total,
        score: result.score,
        reportFile: result.healed > 0 ? PROTO.report : null,
        logFile: log.relativePath(),
    };
}

module.exports = { runQASkill, _manifest: MANIFEST };
