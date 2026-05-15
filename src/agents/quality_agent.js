const BaseAgent = require('../core/base_agent');
const fs = require('fs-extra');
const path = require('path');

const REPORT_REL = 'logs/QA/REPORT_Quality_Scan.md';

class QualityAgent extends BaseAgent {
    constructor(targetDir) {
        super('Quality', targetDir);
        this.findings = [];
    }

    async run() {
        this.log('Memulai pemindaian kualitas kode...', '\x1b[36m');
        this.scan(this.targetDir);

        let reportContent = `# 📐 AEGIS QUALITY CODE SCAN - ${new Date().toLocaleString()}\n\n`;
        reportContent += `> Fokus: kebersihan, maintainability, dan hygiene kode — **bukan** kerentanan keamanan (gunakan SecurityCode).\n\n`;

        if (this.findings.length > 0) {
            this.findings.forEach((f) => {
                reportContent += `### ◇ ${f.issue} (${f.severity})\n`;
                reportContent += `- **File:** ${f.file}:${f.line}\n`;
                reportContent += `- **Deskripsi:** ${f.description}\n`;
                reportContent += `- **Kode:** \`${f.currentCode}\`\n\n`;
            });
        } else {
            reportContent += `✅ Tidak ditemukan isu kualitas kode yang perlu diperbaiki.\n`;
        }

        const reportPath = path.join(this.targetDir, REPORT_REL);
        await fs.ensureDir(path.dirname(reportPath));
        await fs.outputFile(reportPath, reportContent);

        this.log(
            `Pemindaian kualitas selesai. Ditemukan ${this.findings.length} isu.`,
            this.findings.length > 0 ? '\x1b[33m' : '\x1b[32m',
        );
        this.log(`Laporan scan: ${REPORT_REL}`, '\x1b[90m');
        return this.findings;
    }

    scan(dir) {
        const ignore = ['node_modules', '.git', '.next', 'dist', 'docs', 'backups', 'logs', 'openclaw'];
        let items;
        try {
            items = fs.readdirSync(dir);
        } catch {
            return;
        }

        for (const item of items) {
            if (ignore.includes(item)) continue;
            const fullPath = path.join(dir, item);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch {
                continue;
            }

            if (stat.isDirectory()) {
                this.scan(fullPath);
            } else if (['.js', '.ts', '.tsx', '.jsx'].includes(path.extname(item))) {
                this.analyzeFile(fullPath);
            }
        }
    }

    pushFinding(payload) {
        this.findings.push({
            category: 'quality',
            ...payload,
        });
    }

    analyzeFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const rel = path.relative(this.targetDir, filePath);

        lines.forEach((line, i) => {
            const trimLine = line.trim();
            if (!trimLine || trimLine.startsWith('//')) return;

            if (/\bconsole\.(log|debug|info)\s*\(/.test(line)) {
                this.pushFinding({
                    file: rel,
                    line: i + 1,
                    issue: 'Debug Console Statement',
                    severity: 'Low',
                    currentCode: trimLine,
                    fixedCode: trimLine.replace(
                        /console\.(log|debug|info)\s*\([^)]*\);?/,
                        '// [QA] removed debug log',
                    ),
                    description: 'Statement debug sebaiknya tidak ada di kode produksi.',
                });
            }

            if (/\bdebugger\b;?/.test(trimLine)) {
                this.pushFinding({
                    file: rel,
                    line: i + 1,
                    issue: 'Debugger Statement',
                    severity: 'Medium',
                    currentCode: trimLine,
                    fixedCode: '// [QA] removed debugger',
                    description: 'Debugger statement meninggalkan jejak development di kode.',
                });
            }

            if (/\bvar\s+[A-Za-z_$][\w$]*\s*=/.test(line)) {
                this.pushFinding({
                    file: rel,
                    line: i + 1,
                    issue: 'Legacy var Declaration',
                    severity: 'Medium',
                    currentCode: trimLine,
                    fixedCode: trimLine.replace(/\bvar\b/, 'const'),
                    description: 'Gunakan const/let untuk scope yang lebih aman dan mudah dibaca.',
                });
            }

            if (line.length > 0 && /\s+$/.test(line)) {
                this.pushFinding({
                    file: rel,
                    line: i + 1,
                    issue: 'Trailing Whitespace',
                    severity: 'Low',
                    currentCode: trimLine,
                    fixedCode: trimLine,
                    description: 'Whitespace di akhir baris mengganggu diff dan formatter.',
                });
            }

            if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
                this.pushFinding({
                    file: rel,
                    line: i + 1,
                    issue: 'Empty Catch Block',
                    severity: 'Medium',
                    currentCode: trimLine,
                    fixedCode: trimLine.replace(
                        /\{\s*\}/,
                        '{ /* [QA] TODO: handle error */ }',
                    ),
                    description: 'Catch kosong menyembunyikan kegagalan dan menyulitkan debugging.',
                });
            }
        });
    }
}

module.exports = QualityAgent;
