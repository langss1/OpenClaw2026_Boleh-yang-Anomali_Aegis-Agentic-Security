const AskAgent = require('../../agents/ask_agent');

async function runAsk(targetDir, question) {
    const ask = new AskAgent(targetDir);
    await ask.run(question);
}

module.exports = { runAsk };
