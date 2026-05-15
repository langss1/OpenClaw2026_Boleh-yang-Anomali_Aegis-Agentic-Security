const ArchitectAgent = require('../agents/architect_agent');

async function runDevelopment(targetDir) {
    const architect = new ArchitectAgent(targetDir);
    await architect.run();
}

module.exports = { runDevelopment };
