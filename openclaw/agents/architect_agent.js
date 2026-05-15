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
        this.log(`Middleware dibuat di ${mwPath}`, '\x1b[32m');
    }
}

module.exports = ArchitectAgent;
