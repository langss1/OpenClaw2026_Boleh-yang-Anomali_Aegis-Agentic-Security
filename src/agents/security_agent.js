const BaseAgent = require('../core/base_agent');
const fs = require('fs-extra');
const path = require('path');

class SecurityAgent extends BaseAgent {
    constructor(targetDir) {
        super('Security', targetDir);
        this.findings = [];
    }

    async run() {
        this.log('Memulai pemindaian kode (SAST)...', '\x1b[33m');
        this.scan(this.targetDir);
        
        const reportRel = 'logs/Security_Code/REPORT_Security_Code.md';
        let reportContent = `# 🔍 AEGIS SECURITY CODE REPORT - ${new Date().toLocaleString()}\n\n`;
        reportContent += `> Fokus: kerentanan keamanan (SAST) — **bukan** kualitas/hygiene kode (gunakan QA / QualityCode).\n\n`;
        if (this.findings.length > 0) {
            this.findings.forEach(f => {
                reportContent += `### ⚠ ${f.issue} (${f.severity})\n`;
                reportContent += `- **File:** ${f.file}:${f.line}\n`;
                reportContent += `- **Deskripsi:** ${f.description}\n`;
                reportContent += `- **Kode:** \`${f.currentCode}\`\n\n`;
            });
        } else {
            reportContent += `✅ Tidak ditemukan kerentanan keamanan kritis.\n`;
        }

        const reportPath = path.join(this.targetDir, reportRel);
        await fs.ensureDir(path.dirname(reportPath));
        await fs.outputFile(reportPath, reportContent);

        this.log(`Pemindaian keamanan selesai. Ditemukan ${this.findings.length} celah.`, this.findings.length > 0 ? '\x1b[31m' : '\x1b[32m');
        this.log(`Laporan: ${reportRel}`, '\x1b[90m');
        return this.findings;
    }

    scan(dir) {
        const ignore = ['node_modules', '.git', '.next', 'dist', 'docs', 'backups', 'logs', 'openclaw'];
        const items = fs.readdirSync(dir);

        for (const item of items) {
            if (ignore.includes(item)) continue;
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                this.scan(fullPath);
            } else if (['.js', '.ts', '.tsx', '.py', '.env'].includes(path.extname(item))) {
                this.analyzeFile(fullPath);
            }
        }
    }

    analyzeFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, i) => {
            const trimLine = line.trim();
            const secretMatch = line.match(/(password|secret|key|token|auth|sb_|sk_|AKIA)/i);
            const valueMatch = line.match(/[:=]\s*['"]([^'"]+)['"]/);
            
            if (secretMatch && valueMatch && valueMatch[1].length > 8) {
                this.findings.push({
                    category: 'security',
                    file: path.relative(this.targetDir, filePath),
                    line: i + 1,
                    issue: 'Hardcoded Sensitive Data',
                    severity: 'Critical',
                    currentCode: trimLine,
                    fixedCode: line.replace(/['"][^'"]+['"]/, `process.env.${secretMatch[0].toUpperCase()}`),
                    description: `Ditemukan kredensial yang tersimpan secara eksplisit.`
                });
            }

            if (/(query|select|update|delete).*\$\{.*\}|f['"].*\{.*\}['"]/i.test(line)) {
                this.findings.push({
                    category: 'security',
                    file: path.relative(this.targetDir, filePath),
                    line: i + 1,
                    issue: 'SQL Injection Vulnerability',
                    severity: 'High',
                    currentCode: trimLine,
                    fixedCode: "// USE PARAMETERIZED QUERIES",
                    description: 'Input dinamis dimasukkan langsung ke query database.'
                });
            }
        });
    }
}

module.exports = SecurityAgent;
