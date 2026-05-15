const BaseAgent = require('../core/base_agent');
const fs = require('fs-extra');
const path = require('path');

class PatchAgent extends BaseAgent {
    constructor(targetDir) {
        super('Patch', targetDir);
    }

    async run(findings) {
        this.log('Menerapkan perbaikan yang disetujui...', '\x1b[32m');
        let healed = 0;
        let reportContent = `# 🛡️ AEGIS QA REPORT - ${new Date().toLocaleString()}\n\n`;

        if (findings.length === 0) return 0;



        for (const f of findings) {
            try {
                const fullPath = path.join(this.targetDir, f.file);
                const original = fs.readFileSync(fullPath, 'utf8');
                const lines = original.split('\n');

                if (lines[f.line - 1].trim() === f.currentCode) {
                    const backupDir = path.join(this.targetDir, 'backups');
                    await fs.ensureDir(backupDir);
                    const backupPath = path.join(backupDir, `${f.file.replace(/[\\/]/g, '_')}.bak`);
                    if (!fs.existsSync(backupPath)) await fs.writeFile(backupPath, original);

                    lines[f.line - 1] = lines[f.line - 1].replace(f.currentCode, f.fixedCode);
                    await fs.writeFile(fullPath, lines.join('\n'));
                    this.log(`Fixed: ${f.file}:${f.line}`, '\x1b[32m');
                    reportContent += `✅ **FIXED:** ${f.file}:${f.line} - ${f.issue}\n`;
                    healed++;
                }
            } catch (e) {
                this.log(`Gagal memperbaiki ${f.file}: ${e.message}`, '\x1b[31m');
                reportContent += `❌ **FAILED:** ${f.file} - ${e.message}\n`;
            }
        }

        const reportPath = path.join(this.targetDir, 'docs/REPORT_QA.md');
        await fs.outputFile(reportPath, reportContent);
        return healed;
    }
}

module.exports = PatchAgent;
