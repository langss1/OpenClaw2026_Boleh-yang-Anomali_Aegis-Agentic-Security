class BaseAgent {
    constructor(name, targetDir) {
        this.name = name;
        this.targetDir = targetDir;
    }

    log(message, color = '\x1b[37m') {
        console.log(`${color}[${this.name.toUpperCase()}]\x1b[0m ${message}`);
    }

    async run() {
        throw new Error('Method run() must be implemented');
    }
}

module.exports = BaseAgent;
