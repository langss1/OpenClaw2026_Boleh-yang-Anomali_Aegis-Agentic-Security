'use strict';

const fs = require('fs');
const { parseQACliArgs } = require('./parseArgs');
const { runQAAgent } = require('./index');
const { runQuality } = require('../../../src/modules/QualityCode');

async function runQAFromCli(qaArgs) {
    const { targetDir, autoConfirm, verbose } = parseQACliArgs(qaArgs);

    if (!fs.existsSync(targetDir)) {
        throw new Error(`[QA] target tidak ditemukan: ${targetDir}`);
    }

    const findings = await runQuality(targetDir);

    const onEvent = verbose
        ? (evt) => console.log(`\x1b[36m▸\x1b[0m ${evt.type}`)
        : undefined;

    const result = await runQAAgent({ targetDir, findings, autoConfirm, onEvent });

    console.log(`\n\x1b[32m[QA]\x1b[0m Selesai — Run-ID: ${result.runId}`);
    console.log(`  Target : ${targetDir}`);
    console.log(`  Score  : ${result.score}/100 (${result.healed}/${result.total} diperbaiki)`);
    if (result.reportFile) console.log(`  Laporan: ${result.reportFile}`);
    if (result.logFile) console.log(`  Log    : ${result.logFile}`);

    return result;
}

module.exports = { runQAFromCli };
