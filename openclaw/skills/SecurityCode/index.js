const SecurityAgent = require('../../agents/security_agent');

async function runSecurity(targetDir) {
    const security = new SecurityAgent(targetDir);
    return await security.run();
}

module.exports = { runSecurity };
