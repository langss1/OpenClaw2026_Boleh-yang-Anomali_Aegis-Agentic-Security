#!/usr/bin/env node
'use strict';

/**
 * `openclaw` — CLI shim untuk memanggil Aegis agents lewat sintaks OpenClaw-style.
 *
 * Sintaks yang didukung:
 *   openclaw list
 *   openclaw describe --agent <name>
 *   openclaw run --agent <name> --task "<free-text>"
 *   openclaw run --agent <name> --input '<json>'
 *   openclaw run --agent <name> --target <url> [--categories A01,A03]   # pentest convenience
 *   openclaw help
 *
 * Catatan: Ini shim lokal yang sengaja meniru pola perintah resmi OpenClaw
 * (`openclaw agent --agent X --message Y`) namun dengan input structured
 * sesuai manifest agent. Lihat openclaw/bin/README.md untuk detail.
 *
 * Tidak ada dependency eksternal — pakai built-in Node saja.
 */

const fs = require('fs');
const path = require('path');
const { runIntentParser } = require('../lib/cli/intent');

// ─────────────────────────────────────────────────────────────────────────────
// Path discovery
// ─────────────────────────────────────────────────────────────────────────────

const OPENCLAW_ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(OPENCLAW_ROOT, 'agents');

// Deteksi nama binary yang dipakai user (aegis vs openclaw vs lainnya).
// Dipakai di banner & tip supaya konsisten.
const SELF_NAME = (() => {
    try {
        const base = path.basename(process.argv[1] || '');
        if (/aegis/i.test(base)) return 'aegis';
        if (/^main\.js$/.test(base) && /\/src\/cli\//.test(process.argv[1] || '')) return 'aegis';
    } catch (_) { /* ignore */ }
    return 'openclaw';
})();

// ─────────────────────────────────────────────────────────────────────────────
// ANSI
// ─────────────────────────────────────────────────────────────────────────────

const NO_COLOR = process.env.NO_COLOR === '1' || !process.stdout.isTTY;
const c = {
    reset: NO_COLOR ? '' : '\x1b[0m',
    bold: NO_COLOR ? '' : '\x1b[1m',
    dim: NO_COLOR ? '' : '\x1b[2m',
    red: NO_COLOR ? '' : '\x1b[31m',
    green: NO_COLOR ? '' : '\x1b[32m',
    yellow: NO_COLOR ? '' : '\x1b[33m',
    blue: NO_COLOR ? '' : '\x1b[34m',
    magenta: NO_COLOR ? '' : '\x1b[35m',
    cyan: NO_COLOR ? '' : '\x1b[36m',
    gray: NO_COLOR ? '' : '\x1b[90m',
};
const paint = (color, t) => `${c[color] || ''}${t}${c.reset}`;

// ─────────────────────────────────────────────────────────────────────────────
// Argv parser (handwritten, no deps)
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const opts = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--') {
            opts._.push(...argv.slice(i + 1));
            break;
        }
        if (a.startsWith('--')) {
            const eq = a.indexOf('=');
            if (eq > 0) {
                opts[a.slice(2, eq)] = a.slice(eq + 1);
            } else {
                const next = argv[i + 1];
                if (!next || next.startsWith('-')) opts[a.slice(2)] = true;
                else { opts[a.slice(2)] = next; i++; }
            }
        } else if (a.startsWith('-') && a.length > 1) {
            const k = a.slice(1);
            const next = argv[i + 1];
            if (!next || next.startsWith('-')) opts[k] = true;
            else { opts[k] = next; i++; }
        } else {
            opts._.push(a);
        }
    }
    return opts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent registry — auto-discover dari openclaw/agents/*/agent.json
// ─────────────────────────────────────────────────────────────────────────────

function discoverAgents() {
    if (!fs.existsSync(AGENTS_DIR)) return [];
    const out = [];
    for (const entry of fs.readdirSync(AGENTS_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const manifestPath = path.join(AGENTS_DIR, entry.name, 'agent.json');
        if (!fs.existsSync(manifestPath)) continue;
        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            out.push({
                id: (manifest.name || entry.name).toLowerCase(),
                folder: entry.name,
                manifest,
                manifestPath,
                modulePath: path.join(AGENTS_DIR, entry.name),
            });
        } catch (e) {
            // Skip manifest yang corrupt; jangan crash CLI.
            process.stderr.write(
                paint('yellow', `[warn] gagal parse ${manifestPath}: ${e.message}\n`),
            );
        }
    }
    return out;
}

function findAgent(name) {
    if (!name) return null;
    const needle = String(name).toLowerCase();
    const agents = discoverAgents();
    return agents.find(
        (a) => a.id === needle
            || a.folder.toLowerCase() === needle
            || (a.manifest.title || '').toLowerCase() === needle,
    ) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output helpers
// ─────────────────────────────────────────────────────────────────────────────

function printBanner() {
    const label = `${SELF_NAME} agent runtime — Aegis edition`;
    if (NO_COLOR) {
        console.log(label + '\n');
        return;
    }
    const pad = Math.max(0, 46 - label.length);
    console.log(`${c.bold}${c.cyan}╔══════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.cyan}║  ${paint('magenta', SELF_NAME)} ${paint('gray', '·')} agent runtime — Aegis edition${' '.repeat(Math.max(0, pad - SELF_NAME.length + 2))}║${c.reset}`);
    console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════╝${c.reset}\n`);
}

function printHelp() {
    printBanner();
    console.log(`${c.bold}USAGE${c.reset}
  ${SELF_NAME} <command> [options]

${c.bold}COMMANDS${c.reset}
  ${paint('cyan', 'list')}                                  Tampilkan semua agent yang terdaftar
  ${paint('cyan', 'describe')} --agent <name>               Tampilkan manifest agent
  ${paint('cyan', 'run')}      --agent <name> ...           Jalankan agent (lihat opsi di bawah)
  ${paint('cyan', 'help')}                                  Tampilkan bantuan

${c.bold}OPSI 'run'${c.reset}
  --agent <name>                  Nama agent (case-insensitive). Wajib.
  --task "<free-text>"            Task dalam bahasa alami; akan diparse otomatis.
  --input '<json>'                Input terstruktur langsung (JSON). Lebih presisi
                                  dari --task; mengabaikan intent parser.
  --target <url>                  Shortcut: untuk agent Pentest — set targetUrl.
  --categories <list>             Pentest: A01,A03 (default per manifest agent).
  --auto-confirm <mode>           never | safe-only | after-report | all
                                  (sesuai mode yang manifest izinkan).
  --dir <path>                    targetDir (default: cwd).
  --ai / --no-ai                  Aktifkan/nonaktifkan AI intent parser
                                  (default: regex heuristic, tanpa LLM call).
  --json                          Cetak hasil sebagai JSON (mode CI-friendly).
  --verbose, -v                   Tampilkan event agent secara real-time.

${c.bold}CONTOH${c.reset}
  ${paint('gray', '# 1) Lihat daftar agent')}
  ${SELF_NAME} list

  ${paint('gray', '# 2) Lihat detail agent')}
  ${SELF_NAME} describe --agent pentest

  ${paint('gray', '# 3) Jalankan agent dengan task alami (intent parser)')}
  ${SELF_NAME} run --agent pentest --task "scan http://127.0.0.1:3000 untuk SQLi"

  ${paint('gray', '# 4) Jalankan agent dengan input JSON (presisi)')}
  ${SELF_NAME} run --agent pentest \\
    --input '{"targetUrl":"http://127.0.0.1:3000","categories":["A03"],"perCategory":3}'

  ${paint('gray', '# 5) Shortcut flag-based')}
  ${SELF_NAME} run --agent pentest --target http://127.0.0.1:3000 --categories A01,A03 -v
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: list
// ─────────────────────────────────────────────────────────────────────────────

function cmdList(opts) {
    const agents = discoverAgents();
    if (opts.json) {
        process.stdout.write(JSON.stringify(
            agents.map((a) => ({
                id: a.id,
                folder: a.folder,
                title: a.manifest.title,
                version: a.manifest.version,
                role: a.manifest.role,
                scope: a.manifest.scope,
                handler: a.manifest.handler,
            })),
            null,
            2,
        ) + '\n');
        return 0;
    }

    printBanner();
    if (agents.length === 0) {
        console.log(paint('yellow', '(tidak ada agent terdeteksi di openclaw/agents/)'));
        return 0;
    }

    console.log(`${c.bold}Agent terdaftar (${agents.length}):${c.reset}\n`);
    for (const a of agents) {
        const m = a.manifest;
        console.log(`  ${paint('green', '•')} ${paint('bold', m.title || a.id)} ${paint('gray', `(${a.id})`)}`);
        console.log(`    ${paint('gray', 'version')}: ${m.version || '-'}    ${paint('gray', 'role')}: ${m.role || '-'}`);
        console.log(`    ${paint('gray', 'scope')}:   ${m.scope || '-'}    ${paint('gray', 'handler')}: ${m.handler || '-'}`);
        if (m.description) {
            const desc = m.description.length > 88 ? m.description.slice(0, 85) + '...' : m.description;
            console.log(`    ${paint('gray', desc)}`);
        }
        console.log('');
    }
    console.log(paint('gray', `Pakai \`${SELF_NAME} describe --agent <id>\` untuk detail.`));
    return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: describe
// ─────────────────────────────────────────────────────────────────────────────

function cmdDescribe(opts) {
    const agent = findAgent(opts.agent);
    if (!agent) {
        process.stderr.write(paint('red', `[err] agent '${opts.agent}' tidak ditemukan.\n`));
        process.stderr.write(paint('gray', `Pakai '${SELF_NAME} list' untuk lihat opsi.\n`));
        return 2;
    }
    if (opts.json) {
        process.stdout.write(JSON.stringify(agent.manifest, null, 2) + '\n');
        return 0;
    }
    const m = agent.manifest;
    printBanner();
    console.log(`${c.bold}${m.title || agent.id}${c.reset} ${paint('gray', `v${m.version || '-'}`)}`);
    console.log(`${paint('gray', m.description || '')}\n`);

    console.log(paint('bold', 'Manifest:'));
    console.log(`  id        : ${agent.id}`);
    console.log(`  folder    : openclaw/agents/${agent.folder}/`);
    console.log(`  entry     : ${m.entry}`);
    console.log(`  handler   : ${m.handler}`);
    console.log(`  scope     : ${m.scope || '-'}`);
    if (m.skills && m.skills.length) {
        console.log(`  skills    : ${m.skills.map((s) => s.name).join(', ')}`);
    }

    if (m.io && m.io.input) {
        console.log(`\n${paint('bold', 'Input (manifest io.input):')}`);
        for (const [k, v] of Object.entries(m.io.input)) {
            console.log(`  ${paint('cyan', k.padEnd(16))} ${paint('gray', String(v))}`);
        }
    }

    if (m.policies?.autoConfirm) {
        console.log(`\n${paint('bold', 'autoConfirm modes:')}`);
        console.log(`  ${m.policies.autoConfirm.modes.join(' | ')}` +
            ` ${paint('gray', `(default: ${m.policies.autoConfirm.default})`)}`);
    }

    console.log(`\n${paint('bold', 'Contoh invokasi:')}`);
    console.log(`  ${paint('gray', '# free-text via intent parser')}`);
    console.log(`  ${SELF_NAME} run --agent ${agent.id} --task "..."`);
    console.log(`  ${paint('gray', '# JSON terstruktur (lihat io.input di atas)')}`);
    console.log(`  ${SELF_NAME} run --agent ${agent.id} --input '<json>'\n`);
    return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: run
// ─────────────────────────────────────────────────────────────────────────────

async function cmdRun(opts) {
    const agent = findAgent(opts.agent);
    if (!agent) {
        process.stderr.write(paint('red', `[err] agent '${opts.agent || ''}' tidak ditemukan.\n`));
        process.stderr.write(paint('gray', `Pakai '${SELF_NAME} list' untuk lihat opsi.\n`));
        return 2;
    }

    let input;
    if (opts.input) {
        try {
            input = JSON.parse(opts.input);
        } catch (e) {
            process.stderr.write(paint('red', `[err] --input bukan JSON valid: ${e.message}\n`));
            return 2;
        }
    } else if (opts.task || opts.target || opts.categories || opts.dir) {
        // Build input dari kombinasi --task + flag-based shortcuts.
        try {
            input = await runIntentParser({
                agentId: agent.id,
                manifest: agent.manifest,
                task: opts.task,
                target: opts.target,
                categories: opts.categories,
                dir: opts.dir,
                autoConfirm: opts['auto-confirm'],
                useAI: opts.ai === true && opts['no-ai'] !== true,
                verbose: opts.verbose === true || opts.v === true,
            });
        } catch (e) {
            process.stderr.write(paint('red', `[err] intent parser gagal: ${e.message}\n`));
            return 3;
        }
    } else {
        process.stderr.write(paint('red', '[err] beri salah satu: --task "..." | --input <json> | --target <url>\n'));
        return 2;
    }

    if (opts.verbose === true || opts.v === true) {
        process.stderr.write(paint('gray', `[parsed input] ${JSON.stringify(input)}\n`));
    }

    // Load handler dari manifest.entry + manifest.handler
    let mod;
    try {
        const entryAbs = path.resolve(agent.modulePath, agent.manifest.entry || './index.js');
        mod = require(entryAbs);
    } catch (e) {
        process.stderr.write(paint('red', `[err] gagal load module agent: ${e.message}\n`));
        if (process.env.AEGIS_DEBUG === '1' && e.stack) {
            process.stderr.write(e.stack + '\n');
        }
        return 4;
    }

    const handlerName = agent.manifest.handler || 'run';
    const handler = mod[handlerName];
    if (typeof handler !== 'function') {
        process.stderr.write(paint('red', `[err] handler '${handlerName}' tidak ditemukan di module.\n`));
        return 4;
    }

    // Event listener — pretty print event timeline.
    const verbose = opts.verbose === true || opts.v === true;
    const events = [];
    input.onEvent = (ev) => {
        events.push(ev);
        if (!verbose) return;
        const t = (ev.ts || new Date().toISOString()).slice(11, 19);
        process.stderr.write(`${paint('gray', `[${t}]`)} ${paint('cyan', ev.type)} ` +
            paint('gray', JSON.stringify({ ...ev, ts: undefined, type: undefined })) + '\n');
    };

    const startTs = Date.now();
    if (!opts.json) {
        printBanner();
        console.log(`${paint('bold', 'Agent     :')} ${agent.manifest.title || agent.id}`);
        console.log(`${paint('bold', 'Handler   :')} ${handlerName}`);
        console.log(`${paint('bold', 'Input     :')} ${JSON.stringify({ ...input, onEvent: undefined })}\n`);
        console.log(paint('gray', '▶ Menjalankan agent...\n'));
    }

    let result;
    try {
        result = await handler(input);
    } catch (e) {
        if (opts.json) {
            process.stdout.write(JSON.stringify({
                ok: false,
                error: e.message,
                events,
            }, null, 2) + '\n');
        } else {
            process.stderr.write(paint('red', `\n[error] ${e.message}\n`));
            if (process.env.AEGIS_DEBUG === '1' && e.stack) {
                process.stderr.write(e.stack + '\n');
            }
        }
        return 1;
    }

    const elapsedMs = Date.now() - startTs;
    if (opts.json) {
        process.stdout.write(JSON.stringify({
            ok: true,
            agent: agent.id,
            elapsedMs,
            result,
            events: verbose ? events : undefined,
        }, null, 2) + '\n');
        return 0;
    }

    console.log(`\n${paint('green', '✓')} ${paint('bold', 'Selesai')} ${paint('gray', `(${elapsedMs}ms)`)}`);
    console.log(`${paint('bold', 'Result:')}`);
    console.log(formatResultPretty(result));
    return 0;
}

function formatResultPretty(result) {
    if (!result || typeof result !== 'object') return String(result);
    const out = [];
    const keys = Object.keys(result);
    for (const k of keys) {
        let v = result[k];
        if (Array.isArray(v)) v = `[${v.length} item]`;
        else if (v && typeof v === 'object') v = `<object: ${Object.keys(v).slice(0, 5).join(',')}...>`;
        else if (typeof v === 'string' && v.length > 90) v = v.slice(0, 87) + '...';
        out.push(`  ${paint('cyan', k.padEnd(20))} ${paint('gray', String(v))}`);
    }
    return out.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main — accept argv parameter agar bisa dipanggil dari `aegis` CLI juga.
// ─────────────────────────────────────────────────────────────────────────────

async function main(argv = process.argv.slice(2)) {
    if (argv.length === 0 || argv[0] === 'help' || argv[0] === '--help' || argv[0] === '-h') {
        printHelp();
        return 0;
    }

    const sub = argv[0];
    const opts = parseArgs(argv.slice(1));

    switch (sub) {
        case 'list':     return cmdList(opts);
        case 'describe': return cmdDescribe(opts);
        case 'run':      return await cmdRun(opts);
        case '--version':
        case '-V':
        case 'version':  process.stdout.write('openclaw-shim 0.1.0\n'); return 0;
        default:
            process.stderr.write(paint('red', `[err] command tidak dikenal: ${sub}\n`));
            process.stderr.write(paint('gray', `Pakai '${SELF_NAME} help' untuk daftar command.\n`));
            return 2;
    }
}

module.exports = { main };

if (require.main === module) {
    main().then(
        (code) => process.exit(typeof code === 'number' ? code : 0),
        (e) => {
            process.stderr.write(paint('red', `\n[fatal] ${e.message}\n`));
            if (process.env.AEGIS_DEBUG === '1' && e.stack) process.stderr.write(e.stack + '\n');
            process.exit(1);
        },
    );
}
