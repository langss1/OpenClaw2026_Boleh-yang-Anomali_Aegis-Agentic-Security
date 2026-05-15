#!/usr/bin/env node
const path = require('path');
const logo = `
  \x1b[31m█████╗    ███████╗    ██████╗    ██╗    ███████╗\x1b[0m
 \x1b[31m██╔══██╗   ██╔════╝   ██╔════╝    ██║    ██╔════╝\x1b[0m
 \x1b[31m███████║   █████╗     ██║  ███╗   ██║    ███████╗\x1b[0m
 \x1b[31m██╔══██║   ██╔══╝     ██║   ██║   ██║    ╚════██║\x1b[0m
 \x1b[31m██║  ██║   ███████╗   ╚██████╔╝   ██║    ███████║\x1b[0m
 \x1b[31m╚═╝  ╚═╝   ╚══════╝    ╚═════╝    ╚═╝    ╚══════╝\x1b[0m
\x1b[37maegis security \x1b[31mv3.0.0-professional\x1b[0m
`;

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const targetDir = process.cwd();

    // Delegasi ke OpenClaw shim untuk subcommand agent-oriented.
    // Mode ini SKIP banner besar (logo) supaya output tetap clean — terutama
    // saat output di-pipe / dipakai mode --json.
    if (command === 'run' || command === 'list' || command === 'describe') {
        const { main: openclawMain } = require('../../openclaw/bin/openclaw');
        const code = await openclawMain([command, ...args.slice(1)]);
        process.exit(typeof code === 'number' ? code : 0);
    }

    console.clear();
    console.log(logo);

    try {
        switch (command) {
            case 'SecurityCode':
                const { runSecurity } = require('../modules/SecurityCode');
                await runSecurity(targetDir);
                break;
            case 'QA': {
                const { runQAFromCli } = require('../../openclaw/agents/QA/cli');
                await runQAFromCli(args.slice(1));
                break;
            }
            case 'LocalPentest':
                const { runSecurity: getFindingsP } = require('../modules/SecurityCode');
                const findingsP = await getFindingsP(targetDir);
                const { runPentest } = require('../modules/LocalPentest');
                await runPentest(targetDir, findingsP);
                break;
            case 'Development':
                const { runDevelopment } = require('../modules/Development');
                await runDevelopment(targetDir);
                break;
            case 'Ask':
                const { runAsk } = require('../modules/Ask');
                const q = args.slice(1).join(' ') || '';
                await runAsk(targetDir, q);
                break;
            case 'setup':
                const { runSetup } = require('../modules/Setup');
                await runSetup(targetDir);
                break;
            case 'autopilot':
                const Orchestrator = require('../core/orchestrator');
                await new Orchestrator(targetDir).runFullPipeline();
                break;
            case 'help':
            default: {
                const { getQACliHelpLines } = require('../../openclaw/agents/QA/parseArgs');
                const qaHelp = getQACliHelpLines().map((l) => `  ${l}`).join('\n');
                console.log(`
\x1b[1mFITUR UTAMA (AEGIS SKILLS):\x1b[0m
  \x1b[34mSecurityCode\x1b[0m   Pemindaian keamanan (SAST): secret, injection, dll.
  \x1b[32mQA\x1b[0m             Kualitas kode: hygiene, kebersihan, auto-fix terkontrol.
${qaHelp}
  \x1b[35mLocalPentest\x1b[0m   Simulasi serangan hacker di komputer lokal.
  \x1b[36mDevelopment\x1b[0m    Buat folder & arsitektur kode yang aman.
  \x1b[38;5;208mAsk\x1b[0m            Tanya pakar keamanan soal codingan Anda (Chat Mode).
  \x1b[33msetup\x1b[0m          Inisialisasi sistem AEGIS (Install & Config).

\x1b[1mAEGIS GATEWAY:\x1b[0m
  \x1b[31mautopilot\x1b[0m      Jalankan semua skill di atas secara berurutan.

\x1b[1mOPENCLAW AGENT (pemanggilan ala OpenClaw):\x1b[0m
  \x1b[36mlist\x1b[0m                                Daftar agent terdaftar
  \x1b[36mdescribe\x1b[0m --agent <name>             Detail manifest agent
  \x1b[36mrun\x1b[0m      --agent <name> --task "..." Jalankan agent dengan task alami
  \x1b[36mrun\x1b[0m      --agent <name> --input '<json>'   Input JSON terstruktur

  Contoh:
    aegis run --agent pentest --task "scan http://localhost:3000 untuk SQLi cepat"
    aegis run --agent pentest --target http://localhost:3000 --categories A01,A03
    aegis list
    aegis describe --agent pentest
                `);
                break;
            }
        }
    } catch (e) {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${e.message}`);
    }
}

main();
