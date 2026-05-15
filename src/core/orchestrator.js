'use strict';

/**
 * Orchestrator — AEGIS Autopilot pipeline.
 *
 * Pipeline lengkap (sequential, dependent):
 *   1. Recon         — inventory project, deteksi framework, list file scope.
 *   2. SecurityCode  — SAST scan: secret, injection patterns, hardcoded creds.
 *   3. LocalPentest  — DAST scan via Aegis Pentest engine (OWASP Top-10).
 *                       Hanya dijalankan kalau ada target URL atau SAST findings.
 *   4. Patch         — auto-fix untuk finding SAST yang bisa di-remediate.
 *
 * Note: modul "Development" (architect_agent) sudah dihapus dari pipeline.
 * Auto-bootstrap secure middleware skarang tanggung jawab module lain (QA).
 */

const ReconAgent = require('../agents/recon_agent');
const SecurityAgent = require('../agents/security_agent');
const PatchAgent = require('../agents/patch_agent');
const { runPentest } = require('../modules/LocalPentest');

class Orchestrator {
    constructor(targetDir, opts = {}) {
        this.targetDir = targetDir;
        this.opts = opts;
    }

    async runFullPipeline() {
        console.log(`\n\x1b[31m[ AEGIS AUTOPILOT INITIALIZED ]\x1b[0m`);

        // Stage 1 — Recon
        await new ReconAgent(this.targetDir).run();

        // Stage 2 — SecurityCode (SAST)
        const findings = await new SecurityAgent(this.targetDir).run();

        // Stage 3 — LocalPentest (DAST) — jalankan bila ada target URL.
        // Default target = http://localhost:8080. User bisa override via env
        // AEGIS_AUTOPILOT_TARGET atau lewat opts.targetUrl.
        const targetUrl = this.opts.targetUrl
            || process.env.AEGIS_AUTOPILOT_TARGET
            || 'http://localhost:8080';

        try {
            await runPentest(this.targetDir, {
                targetUrl,
                autoConfirm: this.opts.autoConfirm || 'after-report',
                categories: this.opts.categories,
                remediate: this.opts.remediate !== false,
                ai: this.opts.ai !== false,
                aiModel: this.opts.aiModel,
            });
        } catch (e) {
            console.log(`\x1b[33m[AUTOPILOT]\x1b[0m LocalPentest skipped: ${e.message}`);
        }

        // Stage 4 — Patch (auto-remediation SAST findings)
        if (findings && findings.length > 0) {
            await new PatchAgent(this.targetDir).run(findings);
        }

        console.log(`\n\x1b[31m[ PIPELINE COMPLETED ]\x1b[0m\n`);
    }
}

module.exports = Orchestrator;
