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
    console.clear();
    console.log(logo);

    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const targetDir = process.cwd();

    try {
        switch (command) {
            case 'SecurityCode':
                const { runSecurity } = require('../modules/SecurityCode');
                await runSecurity(targetDir);
                break;
            case 'QA':
                const { runSecurity: getFindingsQA } = require('../modules/SecurityCode');
                const findingsT = await getFindingsQA(targetDir);
                const { runQA } = require('../modules/QA');
                await runQA(targetDir, findingsT);
                break;
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
            default:
                console.log(`
\x1b[1mFITUR UTAMA (AEGIS SKILLS):\x1b[0m
  \x1b[34mSecurityCode\x1b[0m   Cek kode yang berbahaya / rentan.
  \x1b[32mQA\x1b[0m             Perbaiki kode otomatis (Auto-Fix).
  \x1b[35mLocalPentest\x1b[0m   Simulasi serangan hacker di komputer lokal.
  \x1b[36mDevelopment\x1b[0m    Buat folder & arsitektur kode yang aman.
  \x1b[38;5;208mAsk\x1b[0m            Tanya pakar keamanan soal codingan Anda (Chat Mode).
  \x1b[33msetup\x1b[0m          Inisialisasi sistem AEGIS (Install & Config).

\x1b[1mAEGIS GATEWAY:\x1b[0m
  \x1b[31mautopilot\x1b[0m      Jalankan semua skill di atas secara berurutan.
                `);
        }
    } catch (e) {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${e.message}`);
    }
}

main();
