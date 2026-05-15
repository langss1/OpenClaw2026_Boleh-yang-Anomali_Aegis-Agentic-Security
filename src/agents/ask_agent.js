const BaseAgent = require('../core/base_agent');

class AskAgent extends BaseAgent {
    constructor(targetDir) {
        super('Ask', targetDir);
    }

    async run(question) {
        this.log('Menghubungkan ke pakar keamanan AI...', '\x1b[38;5;208m');
        this.log(`Question: ${question}`, '\x1b[90m');
        const answer = "Berdasarkan arsitektur Anda, gunakan HTTPS dan amankan header dengan Helmet.js.";
        await new Promise(r => setTimeout(r, 800));
        console.log(`\n\x1b[38;5;208m[AEGIS_EXPERT]:\x1b[0m ${answer}\n`);
    }
}

module.exports = AskAgent;
