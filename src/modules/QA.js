const PatchAgent = require('../agents/patch_agent');

async function runQA(targetDir, findings) {
    const patch = new PatchAgent(targetDir);
    await patch.run(findings);
}

module.exports = { runQA };
