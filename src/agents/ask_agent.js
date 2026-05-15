'use strict';

/**
 * AskAgent — chat pakar keamanan (AEGIS AI).
 * Key & endpoint: env AEGIS_* (lihat ask-ai-defaults.js untuk fallback bundled).
 */

const BaseAgent = require('../core/base_agent');
const fs = require('fs-extra');
const path = require('path');

const DEFAULTS = require('./ask-ai-defaults');

const TIMEOUT_MS = 60_000;

try {
    // Opsional: dotenv bila terpasang di project
    require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch (_) { /* no dotenv */ }

function resolveApiKey() {
    return process.env.AEGIS_API_KEY || process.env.DEEPSEEK_API_KEY || DEFAULTS.AEGIS_TOKEN || null;
}

function resolveEndpoint() {
    return process.env.AEGIS_AI_ENDPOINT || process.env.DEEPSEEK_ENDPOINT || DEFAULTS.DEFAULT_ENDPOINT;
}

function resolveModel() {
    return process.env.AEGIS_AI_MODEL || process.env.DEEPSEEK_MODEL || DEFAULTS.DEFAULT_MODEL;
}

class AskAgent extends BaseAgent {
    constructor(targetDir) {
        super('Ask', targetDir);
    }

    async run(question) {
        const apiKey = resolveApiKey();
        const endpoint = resolveEndpoint();
        const model = resolveModel();

        if (!apiKey) {
            this.log('AEGIS_API_KEY tidak ter-set (atau pakai bundled di ask-ai-defaults).', '\x1b[31m');
            return;
        }

        this.log('Menghubungkan ke Aegis AI…', '\x1b[38;5;208m');

        let readmeContent = '';
        let listing = '';
        try {
            const readmePath = path.join(this.targetDir, 'README.md');
            if (await fs.pathExists(readmePath)) readmeContent = await fs.readFile(readmePath, 'utf8');
            listing = (await fs.readdir(this.targetDir)).slice(0, 80).join(', ');
        } catch (_) { /* abaikan */ }

        const sys = `Anda adalah pakar keamanan aplikasi untuk produk AEGIS AI.
Berikan jawaban teknis singkat dan jelas dalam Bahasa Indonesia profesional.
Jangan mengarang CVE; sebut referensi umum (OWASP, CWE) jika relevan.`;

        const userPrompt = `KONTeks project (ringkas):
Struktur file (sebagian): ${listing}

README (potongan):
${readmeContent.slice(0, 6000)}

PERTANYAAN:
${question}`;

        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: sys },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.3,
                    max_tokens: 1024,
                    stream: false,
                }),
                signal: ctrl.signal,
            });
            clearTimeout(tid);

            const raw = await res.text();
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${raw.slice(0, 280)}`);
            }

            const data = JSON.parse(raw);
            const answer = data?.choices?.[0]?.message?.content?.trim() || '(kosong)';
            console.log(`\n\x1b[38;5;208m[AEGIS_EXPERT]:\x1b[0m\n${answer}\n`);

            const u = data?.usage;
            if (u && typeof u.total_tokens === 'number') {
                this.log(`Token: ${u.total_tokens} (prompt ${u.prompt_tokens || '?'} + completion ${u.completion_tokens || '?'})`, '\x1b[90m');
            }
        } catch (err) {
            const msg = err?.name === 'AbortError' ? 'Waktu tunggu habis' : err.message;
            this.log(`Gagal menghubungi Aegis AI: ${msg}`, '\x1b[31m');
        }
    }
}

module.exports = AskAgent;
