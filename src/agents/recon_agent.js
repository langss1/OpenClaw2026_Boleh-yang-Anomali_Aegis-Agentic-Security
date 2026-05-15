const BaseAgent = require('../core/base_agent');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class ReconAgent extends BaseAgent {
    constructor(targetDir) {
        super('Recon', targetDir);
    }

    async run() {
        this.log('Mulai pemetaan arsitektur proyek...', '\x1b[34m');
        
        const metadata = {
            git: this.getGitInfo(),
            stack: this.detectStack(),
            files: this.countFiles(this.targetDir),
            timestamp: new Date().toISOString()
        };

        await this.saveReport(metadata);
        this.log('Pemetaan selesai. Metadata tersimpan.', '\x1b[32m');
        return metadata;
    }

    getGitInfo() {
        try {
            const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
            const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
            return { branch, commit };
        } catch (e) {
            return { branch: 'n/a', commit: 'n/a' };
        }
    }

    detectStack() {
        const stack = [];
        const pkgPath = path.join(this.targetDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = fs.readJsonSync(pkgPath);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            if (deps.next) stack.push('Next.js');
            if (deps.react) stack.push('React');
            if (deps.typescript) stack.push('TypeScript');
        }
        return stack.length > 0 ? stack : ['Generic Node.js'];
    }

    countFiles(dir) {
        let count = 0;
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (['node_modules', '.git', '.next', 'dist', 'docs', 'backups'].includes(item)) continue;
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) count += this.countFiles(fullPath);
            else count++;
        }
        return count;
    }

    async saveReport(data) {
        const reportPath = path.join(this.targetDir, 'docs/AEGIS_INGESTION_REPORT.md');
        let content = `# 🏗️ AEGIS ARCHITECTURE REPORT\n\n`;
        content += `- **Stack:** ${data.stack.join(', ')}\n`;
        content += `- **Git:** ${data.git.branch} (${data.git.commit})\n`;
        content += `- **Files:** ${data.files} analyzed\n`;
        await fs.outputFile(reportPath, content);
    }
}

module.exports = ReconAgent;
