const BaseAgent = require('../../src/core/base_agent');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

require('dotenv').config();

class AskAgent extends BaseAgent {
    constructor(targetDir) {
        super('Ask', targetDir);
        this.apiKey = process.env.GEMINI_API_KEY;
    }

    async run(question) {
        this.log('Menghubungkan ke Google Gemini AI...', '\x1b[38;5;208m');
        
        try {
            const readmePath = path.join(this.targetDir, 'README.md');
            let readmeContent = '';
            let projectStructure = '';

            if (await fs.pathExists(readmePath)) {
                readmeContent = await fs.readFile(readmePath, 'utf8');
            }
            
            const files = await fs.readdir(this.targetDir);
            projectStructure = files.join(', ');

            const prompt = `
Anda adalah pakar keamanan AI dari sistem AEGIS.
Berikut adalah konteks proyek yang sedang dikerjakan:

ISI README:
${readmeContent}

STRUKTUR DIREKTORI:
${projectStructure}

PERTANYAAN PENGGUNA:
"${question}"

Berikan jawaban yang cerdas, teknis, dan membantu berdasarkan konteks di atas. Gunakan Bahasa Indonesia yang profesional.
            `;

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                }
            );

            const answer = response.data.candidates[0].content.parts[0].text;
            console.log(`\n\x1b[38;5;208m[AEGIS_EXPERT]:\x1b[0m\n${answer}\n`);
            
        } catch (error) {
            const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
            this.log(`Gagal mendapatkan jawaban dari Gemini: ${errorMsg}`, '\x1b[31m');
        }
    }
}

module.exports = AskAgent;
