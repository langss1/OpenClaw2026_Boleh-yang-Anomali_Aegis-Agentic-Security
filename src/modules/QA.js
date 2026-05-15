const path = require('path');
const fs = require('fs');
const PatchAgent = require('../agents/patch_agent');
const readline = require('readline');

const QA_SKILL_MANIFEST = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../openclaw/skills/QA/skill.json'), 'utf8'),
);
const QA_REPORT_PATH = QA_SKILL_MANIFEST.protocols.report;

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function runQA(targetDir, findings) {
    console.log(`\n\x1b[36m[QA MODULE]\x1b[0m Memulai proses Quality Assurance...`);
    
    if (!findings || findings.length === 0) {
        console.log(`\x1b[32m[QA MODULE]\x1b[0m Tidak ada isu kualitas kode yang perlu diperbaiki.\n`);
        return { healed: 0, total: 0, score: 100 };
    }

    const qualityFindings = findings.filter((f) => !f.category || f.category === 'quality');
    if (qualityFindings.length === 0) {
        console.log(`\x1b[33m[QA MODULE]\x1b[0m Temuan bukan ranah QA (kualitas). Gunakan SecurityCode untuk isu keamanan.\n`);
        return { healed: 0, total: findings.length, score: 0 };
    }

    console.log(`\x1b[33m[QA MODULE]\x1b[0m Ditemukan ${qualityFindings.length} isu kualitas kode yang bisa di-fix.\n`);

    const confirmedFindings = [];

    for (const f of qualityFindings) {
        console.log(`\x1b[1mFile:\x1b[0m ${f.file}:${f.line}`);
        console.log(`\x1b[1mIsu:\x1b[0m  ${f.issue} (${f.severity})`);
        console.log(`\x1b[31m- ${f.currentCode}\x1b[0m`);
        console.log(`\x1b[32m+ ${f.fixedCode}\x1b[0m`);
        
        let validResponse = false;
        while (!validResponse) {
            const answer = await askQuestion(`\x1b[33mTerapkan fix ini? (y/n):\x1b[0m `);
            const lowerAns = answer.trim().toLowerCase();
            if (lowerAns === 'y') {
                confirmedFindings.push(f);
                validResponse = true;
            } else if (lowerAns === 'n') {
                console.log(`\x1b[90m➜ Fix dilewati.\x1b[0m\n`);
                validResponse = true;
            } else {
                console.log(`\x1b[31mJawaban tidak valid. Harap ketik 'y' atau 'n'.\x1b[0m`);
            }
        }
    }

    if (confirmedFindings.length > 0) {
        const patch = new PatchAgent(targetDir);
        const healed = await patch.run(confirmedFindings, { reportPath: QA_REPORT_PATH });

        const score = Math.round((1 - ((qualityFindings.length - healed) / qualityFindings.length)) * 100);
        console.log(`\n\x1b[32m[QA MODULE]\x1b[0m QA selesai. Quality Score: ${score}/100`);
        console.log(`\x1b[90mLaporan: ${QA_REPORT_PATH}\x1b[0m`);
        return { healed, total: qualityFindings.length, score };
    } else {
        console.log(`\n\x1b[33m[QA MODULE]\x1b[0m Tidak ada perbaikan yang diterapkan.`);
        return { healed: 0, total: qualityFindings.length, score: 0 };
    }
}

module.exports = { runQA };
