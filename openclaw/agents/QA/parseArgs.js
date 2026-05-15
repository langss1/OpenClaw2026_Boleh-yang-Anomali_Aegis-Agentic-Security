'use strict';

const path = require('path');
const fs = require('fs');

const MANIFEST = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'agent.json'), 'utf8'),
);

const CLI = MANIFEST.cli || {};
const FLAGS_WITH_VALUE = new Set(CLI.flagsWithValue || ['--target', '-t', '--auto']);
const TARGET_FLAGS = CLI.targetFlags || ['--target', '-t'];
const AUTO_FLAG = CLI.autoFlag || '--auto';
const BOOLEAN_FLAGS = new Set(CLI.booleanFlags || ['--verbose', '-v']);

const ALLOWED_MODES = new Set(MANIFEST.policies.autoConfirm.modes);
const DEFAULT_MODE = MANIFEST.policies.autoConfirm.default;
const MSG = MANIFEST.messages;

function fmt(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function parseFlagValue(args, flagNames) {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        for (const flag of flagNames) {
            if (arg === flag) {
                const next = args[i + 1];
                if (next && !next.startsWith('-')) return next;
                return null;
            }
            if (arg.startsWith(`${flag}=`)) return arg.slice(flag.length + 1);
        }
    }
    return null;
}

function resolveTargetDir(qaArgs, defaultTarget = process.cwd()) {
    const fromFlag = parseFlagValue(qaArgs, TARGET_FLAGS);
    if (fromFlag) return path.resolve(fromFlag);

    const skipIndices = new Set();
    for (let i = 0; i < qaArgs.length; i++) {
        const a = qaArgs[i];
        if (FLAGS_WITH_VALUE.has(a)) {
            skipIndices.add(i + 1);
            continue;
        }
        if (a.startsWith(`${AUTO_FLAG}=`)) continue;
        if (TARGET_FLAGS.some((f) => a.startsWith(`${f}=`))) continue;
        if (skipIndices.has(i)) continue;
        if (a.startsWith('-')) continue;
        return path.resolve(a);
    }
    return path.resolve(defaultTarget);
}

function parseAutoConfirm(qaArgs) {
    let mode = parseFlagValue(qaArgs, [AUTO_FLAG]);
    if (!mode) {
        const prefix = `${AUTO_FLAG}=`;
        const eq = qaArgs.find((a) => a.startsWith(prefix));
        if (eq) mode = eq.slice(prefix.length);
    }
    if (!mode) return DEFAULT_MODE;
    if (!ALLOWED_MODES.has(mode)) {
        throw new Error(fmt(MSG.errorAutoConfirmInvalid, {
            value: mode,
            modes: [...ALLOWED_MODES].join(', '),
        }));
    }
    return mode;
}

function parseVerbose(qaArgs) {
    return qaArgs.some((a) => BOOLEAN_FLAGS.has(a));
}

/**
 * Parse argv slice setelah perintah `QA` (tanpa subcommand).
 * @param {string[]} qaArgs
 * @param {{ defaultTarget?: string }} [opts]
 * @returns {{ targetDir: string, autoConfirm: string, verbose: boolean }}
 */
function parseQACliArgs(qaArgs, { defaultTarget = process.cwd() } = {}) {
    const args = Array.isArray(qaArgs) ? qaArgs : [];
    return {
        targetDir: resolveTargetDir(args, defaultTarget),
        autoConfirm: parseAutoConfirm(args),
        verbose: parseVerbose(args),
    };
}

function getQACliHelpLines() {
    const modes = [...ALLOWED_MODES].join('|');
    return (CLI.helpLines || [
        '                Opsi: [path] | --target|-t <path> | --auto {modes} | -v',
        '',
        '  Contoh QA:',
        '    aegis QA',
        '    aegis QA <path>',
        '    aegis QA --target <path> --auto safe-only -v',
    ]).map((line) => line.replace('{modes}', modes));
}

module.exports = {
    parseQACliArgs,
    getQACliHelpLines,
    _cliManifest: CLI,
};
