const AskAgent = require('../../openclaw/agents/ask_agent');
const readline = require('readline');

const logo = `
  \x1b[31m█████╗    ███████╗    ██████╗    ██╗    ███████╗\x1b[0m
 \x1b[31m██╔══██╗   ██╔════╝   ██╔════╝    ██║    ██╔════╝\x1b[0m
 \x1b[31m███████║   █████╗     ██║  ███╗   ██║    ███████╗\x1b[0m
 \x1b[31m██╔══██║   ██╔══╝     ██║   ██║   ██║    ╚════██║\x1b[0m
 \x1b[31m██║  ██║   ███████╗   ╚██████╔╝   ██║    ███████║\x1b[0m
 \x1b[31m╚═╝  ╚═╝   ╚══════╝    ╚═════╝    ╚═╝    ╚══════╝\x1b[0m
\x1b[37maegis security \x1b[31mv3.0.0-professional\x1b[0m
`;

async function runAsk(targetDir, question) {
    const ask = new AskAgent(targetDir);

    if (question && question.trim() !== "") {
        console.clear();
        console.log(logo);
        await ask.run(question);
        process.exit(0);
    } 

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.clear();
    console.log(logo);
    console.log('\n\x1b[36m[ASK] Menghubungkan ke Google Gemini AI...\x1b[0m');

    const askLoop = () => {
        rl.question('\x1b[33mAsk Aegis: \x1b[0m', async (answer) => {
            if (answer.trim() === '') {
                askLoop();
                return;
            }

            if (answer.toLowerCase() === 'exit' || answer.toLowerCase() === 'keluar') {
                console.log('\x1b[31m[AEGIS_SYSTEM]: Sesi diakhiri. Sampai jumpa, Agent.\x1b[0m');
                rl.close();
                process.exit(0);
            }

            await ask.run(answer);
            console.log("\n\x1b[90m--------------------------------------------------\x1b[0m");
            askLoop();
        });
    };

    askLoop();
}

module.exports = { runAsk };
