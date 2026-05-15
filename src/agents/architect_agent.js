const BaseAgent = require('../core/base_agent');
const fs = require('fs-extra');
const path = require('path');

class ArchitectAgent extends BaseAgent {
    constructor(targetDir) {
        super('Architect', targetDir);
    }

    async run() {
        this.log('Menghasilkan secure-by-default boilerplate...', '\x1b[36m');
        const mwPath = path.join(this.targetDir, 'src/middleware/security.js');
        const content = `// AEGIS SECURE MIDDLEWARE\nconst helmet = require('helmet');\nmodule.exports = (app) => app.use(helmet());`;
        await fs.outputFile(mwPath, content);
        
        let reportContent = `# 🏗️ AEGIS DEVELOPMENT REPORT - ${new Date().toLocaleString()}\n\n`;
        reportContent += `✅ **SUCCESS:** Generated secure middleware at \`${mwPath}\`.\n`;
        reportContent += `- **Engine:** Helmet.js integrated.\n`;

        const reportPath = path.join(this.targetDir, 'docs/REPORT_Development.md');
        await fs.outputFile(reportPath, reportContent);

        this.log(`Middleware dibuat di ${mwPath}`, '\x1b[32m');
    }
}

module.exports = ArchitectAgent;
