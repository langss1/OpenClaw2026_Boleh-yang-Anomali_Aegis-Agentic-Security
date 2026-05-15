const QualityAgent = require('../agents/quality_agent');

async function runQuality(targetDir) {
    const quality = new QualityAgent(targetDir);
    return quality.run();
}

module.exports = { runQuality };
