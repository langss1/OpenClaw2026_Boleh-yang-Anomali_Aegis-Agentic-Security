#!/usr/bin/env node
'use strict';

/**
 * AEGIS CLI — unified terminal interface untuk seluruh skill Aegis.
 *
 * Fitur (semua jalan real, bukan stub):
 *   • SecurityCode  — SAST scanner (secret, injection patterns, dll.)
 *   • QA            — Auto-remediation kualitas kode (lihat openclaw/agents/QA/cli)
 *   • LocalPentest  — DAST runner (OWASP Top-10) via Aegis Pentest engine real
 *                     (openclaw/agents/Pentest/bin/aegis-pentest.js)
 *   • Ask           — Chat dengan AI security expert (Gemini/DeepSeek)
 *   • setup         — Inisialisasi konfigurasi
 *   • autopilot     — Full pipeline: Recon → SecurityCode → LocalPentest → Patch
 *
 * OpenClaw passthrough: `aegis run/list/describe` → delegasi ke
 * openclaw/bin/openclaw.js (manifest-aware agent invocation).
 */

const path = require('path');

const logo = `
  \x1b[31m█████╗    ███████╗    ██████╗    ██╗    ███████╗\x1b[0m
 \x1b[31m██╔══██╗   ██╔════╝   ██╔════╝    ██║    ██╔════╝\x1b[0m
 \x1b[31m███████║   █████╗     ██║  ███╗   ██║    ███████╗\x1b[0m
 \x1b[31m██╔══██║   ██╔══╝     ██║   ██║   ██║    ╚════██║\x1b[0m
 \x1b[31m██║  ██║   ███████╗   ╚██████╔╝   ██║    ███████║\x1b[0m
 \x1b[31m╚═╝  ╚═╝   ╚══════╝    ╚═════╝    ╚═╝    ╚══════╝\x1b[0m
\x1b[37maegis security \x1b[31mv3.1.0-professional\x1b[0m
`;

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const subArgs = args.slice(1);
    const targetDir = process.cwd();

    // OpenClaw passthrough — skip banner agar output bersih (untuk pipe/JSON).
    if (command === 'run' || command === 'list' || command === 'describe') {
        const { main: openclawMain } = require('../../openclaw/bin/openclaw');
        const code = await openclawMain([command, ...subArgs]);
        process.exit(typeof code === 'number' ? code : 0);
    }

    // LocalPentest passthrough — delegasi ke real Aegis Pentest CLI.
    // Banner di-skip karena aegis-pentest sudah punya banner & help sendiri.
    if (command === 'LocalPentest' || command === 'pentest') {
        return runLocalPentest(subArgs, targetDir);
    }

    console.clear();
    console.log(logo);

    try {
        switch (command) {
            case 'SecurityCode': {
                const { runSecurity } = require('../modules/SecurityCode');
                await runSecurity(targetDir);
                break;
            }
            case 'QA': {
                const { runQAFromCli } = require('../../openclaw/agents/QA/cli');
                await runQAFromCli(subArgs);
                break;
            }
            case 'Ask': {
                const { runAsk } = require('../modules/Ask');
                const q = subArgs.join(' ') || '';
                await runAsk(targetDir, q);
                break;
            }
            case 'setup': {
                // Modul setup belum diimplementasikan — arahkan ke instruksi manual.
                console.log(`\x1b[33m[setup]\x1b[0m Belum ada wizard otomatis. Ikuti langkah ini:`);
                console.log(`  1. \x1b[36mnpm install -g aegis-agentic-security\x1b[0m  (atau install via GitHub)`);
                console.log(`  2. Set env: \x1b[36mAEGIS_API_KEY\x1b[0m (DeepSeek/Aegis AI) & \x1b[36mGEMINI_API_KEY\x1b[0m (Ask).`);
                console.log(`     Atau buat \x1b[36m.env\x1b[0m berdasarkan \x1b[36m.env.example\x1b[0m.`);
                console.log(`  3. Tes: \x1b[36maegis SecurityCode\x1b[0m, \x1b[36maegis QA\x1b[0m, \x1b[36maegis LocalPentest\x1b[0m.`);
                console.log(`  Detail: lihat \x1b[36mdocs/INSTALL.md\x1b[0m & \x1b[36mREADME.md\x1b[0m.`);
                break;
            }
            case 'autopilot': {
                const Orchestrator = require('../core/orchestrator');
                await new Orchestrator(targetDir).runFullPipeline();
                break;
            }
            case 'help':
            case '--help':
            case '-h':
            default: {
                printHelp();
                break;
            }
        }
    } catch (e) {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${e.message}`);
        if (process.env.AEGIS_DEBUG === '1') {
            console.error(e.stack);
        }
        process.exit(1);
    }
}

/**
 * Spawn real Aegis Pentest CLI dan inherit stdio (full interactive support).
 * Bila user tidak kasih argumen → otomatis pakai --interactive (wizard).
 */
function runLocalPentest(subArgs, targetDir) {
    const { spawn } = require('child_process');
    const pentestBin = path.join(
        __dirname, '..', '..',
        'openclaw', 'agents', 'Pentest', 'bin', 'aegis-pentest.js',
    );

    const forwarded = subArgs.length === 0 ? ['--interactive'] : subArgs;

    // Inject --dir <cwd> bila user belum spesifik (supaya report mendarat di project user).
    const hasDir = forwarded.some((a) => a === '-d' || a === '--dir');
    if (!hasDir) forwarded.push('--dir', targetDir);

    const child = spawn(process.execPath, [pentestBin, ...forwarded], {
        stdio: 'inherit',
        env: process.env,
    });

    return new Promise((resolve) => {
        child.on('exit', (code) => {
            process.exit(typeof code === 'number' ? code : 0);
        });
        child.on('error', (err) => {
            console.error(`\x1b[31m[ERROR]\x1b[0m Gagal menjalankan Aegis Pentest: ${err.message}`);
            process.exit(1);
        });
    });
}

function printHelp() {
    let qaHelp = '';
    try {
        const { getQACliHelpLines } = require('../../openclaw/agents/QA/parseArgs');
        qaHelp = getQACliHelpLines().map((l) => `  ${l}`).join('\n');
    } catch (_) { /* abaikan kalau QA helper belum tersedia */ }

    console.log(`
\x1b[1mFITUR UTAMA (AEGIS SKILLS):\x1b[0m
  \x1b[34mSecurityCode\x1b[0m   SAST scanner — deteksi secret, injection, hardcoded creds, dsb.
                 Contoh: aegis SecurityCode

  \x1b[32mQA\x1b[0m             Auto-remediation kualitas kode (hygiene, lint-fix terkontrol).
${qaHelp}

  \x1b[35mLocalPentest\x1b[0m   DAST runner OWASP Top-10 (engine Aegis Pentest real).
                 Pattern-based scanner + AI augmentation (DeepSeek).
                 Contoh:
                   aegis LocalPentest                                  # wizard interaktif
                   aegis LocalPentest -t http://localhost:8080 -y
                   aegis LocalPentest -t http://localhost:3000 --profile deep -r
                   aegis LocalPentest --help                           # bantuan lengkap

  \x1b[38;5;208mAsk\x1b[0m            Chat dengan AI security expert (Gemini/DeepSeek).
                 Contoh: aegis Ask "bagaimana cara mencegah SQL injection?"

  \x1b[33msetup\x1b[0m          Inisialisasi sistem AEGIS (install & config awal).

\x1b[1mAEGIS GATEWAY:\x1b[0m
  \x1b[31mautopilot\x1b[0m      Jalankan semua skill di atas secara berurutan
                 (Recon → SecurityCode → LocalPentest → Patch).

\x1b[1mOPENCLAW AGENT (pemanggilan ala OpenClaw):\x1b[0m
  \x1b[36mlist\x1b[0m                                  Daftar agent terdaftar
  \x1b[36mdescribe\x1b[0m --agent <name>               Detail manifest agent
  \x1b[36mrun\x1b[0m      --agent <name> --task "..."   Jalankan agent dgn task natural language
  \x1b[36mrun\x1b[0m      --agent <name> --input '<json>'  Input JSON terstruktur

  Contoh:
    aegis run --agent pentest --task "scan http://localhost:3000 untuk SQLi cepat"
    aegis run --agent pentest --target http://localhost:3000 --categories A01,A03
    aegis run --agent qa     --findings findings.json
    aegis list
    aegis describe --agent pentest

\x1b[90mTip: jalankan \`aegis LocalPentest --help\` untuk daftar 20+ flag DAST scanner.\x1b[0m
`);
}

main();
