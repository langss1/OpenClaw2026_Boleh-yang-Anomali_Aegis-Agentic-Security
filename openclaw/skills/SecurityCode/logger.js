'use strict';

const fs = require('fs');
const path = require('path');

function isoStamp() {
    return new Date().toISOString();
}

function fileStamp() {
    return isoStamp().replace(/[:.]/g, '-');
}

function createRunLogger(targetDir, opts = {}) {
    const logDir = opts.logDir || path.join('logs', 'Security_Code');
    const prefix = opts.filePrefix != null ? opts.filePrefix : 'run-';
    const ext = opts.fileExtension != null ? opts.fileExtension : '.log';

    const dirAbs = path.join(targetDir, logDir);
    fs.mkdirSync(dirAbs, { recursive: true });
    const file = path.join(dirAbs, `${prefix}${fileStamp()}${ext}`);
    const lines = [];

    function write(level, msg) {
        lines.push(`[${isoStamp()}] [${level}] ${msg}`);
        fs.writeFileSync(file, lines.join('\n') + '\n');
    }

    return {
        file,
        info: (msg) => write('INFO', msg),
        warn: (msg) => write('WARN', msg),
        error: (msg) => write('ERROR', msg),
        section: (title) => write('INFO', `── ${title} ──`),
        relativePath: () => path.relative(targetDir, file).replace(/\\/g, '/'),
    };
}

module.exports = { createRunLogger };
