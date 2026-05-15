'use strict';

/**
 * Intent parser: konvert (task: string, flags) -> structured input untuk handler agent.
 *
 * Strategi:
 *   1. Regex heuristic dulu (fast, no LLM call).
 *   2. Jika `--ai` ON & task ada, tambahkan parsing AI (DeepSeek) untuk
 *      mengisi/override field yang masih kosong.
 *
 * Per-agent adapter (Pentest, QA, dst.) di-pilih berdasarkan agentId/manifest.scope.
 * Agent baru cukup tambah adapter di bawah; CLI utama tidak perlu diubah.
 */

const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// Adapter: Pentest
// ─────────────────────────────────────────────────────────────────────────────

const PENTEST_CATEGORY_KEYWORDS = {
    A01: ['access', 'broken access', 'idor', 'authorization', 'akses', 'role'],
    A02: ['crypto', 'enkripsi', 'cryptographic', 'tls', 'ssl', 'hash'],
    A03: ['injection', 'sqli', 'sql injection', 'xss', 'command injection', 'cmdi', 'rce', 'lfi'],
    A04: ['insecure design', 'design flaw'],
    A05: ['misconfiguration', 'misconfig', 'security headers', 'header'],
    A06: ['vulnerable component', 'outdated', 'cve', 'dependency'],
    A07: ['authentication', 'auth', 'login', 'session', 'password', 'brute force'],
    A08: ['integrity', 'supply chain', 'deserialization'],
    A09: ['logging', 'monitoring', 'audit'],
    A10: ['ssrf', 'server-side request forgery', 'redirect'],
};

const PENTEST_PROFILE_KEYWORDS = {
    quick:    ['cepat', 'quick', 'singkat', 'cepet'],
    standard: ['standar', 'standard', 'biasa', 'normal'],
    deep:     ['dalam', 'deep', 'lengkap', 'menyeluruh', 'thorough'],
};

// Regex IP RFC1918 (10/8, 172.16/12, 192.168/16) + loopback + localhost.
// Sesuai policy targetSafety.allowRFC1918=true di agent.json Pentest.
const HOST_RE = new RegExp(
    '\\b('
    + 'localhost'
    + '|127\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}'
    + '|10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}'
    + '|192\\.168\\.\\d{1,3}\\.\\d{1,3}'
    + '|172\\.(?:1[6-9]|2\\d|3[01])\\.\\d{1,3}\\.\\d{1,3}'
    + ')(:\\d+)?(?:/[^\\s\'"<>]*)?\\b',
    'i',
);

function extractUrl(text) {
    if (!text) return null;
    const m = text.match(/https?:\/\/[^\s'"<>]+/i);
    if (m) return m[0].replace(/[.,;]+$/, '');
    // Fallback: localhost / 127.x / RFC1918 IP tanpa scheme
    const m2 = text.match(HOST_RE);
    if (m2) return `http://${m2[0]}`;
    return null;
}

function detectCategoriesFromText(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const hits = new Set();
    for (const [cat, kws] of Object.entries(PENTEST_CATEGORY_KEYWORDS)) {
        if (kws.some((kw) => lower.includes(kw))) hits.add(cat);
    }
    return [...hits];
}

function detectProfileFromText(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const [profile, kws] of Object.entries(PENTEST_PROFILE_KEYWORDS)) {
        if (kws.some((kw) => lower.includes(kw))) return profile;
    }
    return null;
}

function parseCategoriesFlag(raw) {
    if (!raw || raw === true) return null;
    return String(raw)
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
}

const PROFILES = {
    quick:    { categories: ['A01', 'A03', 'A07'], perCategory: 3, maxIterations: 20 },
    standard: { categories: ['A01', 'A03', 'A07', 'A10'], perCategory: 5, maxIterations: 50 },
    deep:     { categories: ['A01', 'A02', 'A03', 'A05', 'A07', 'A10'], perCategory: 8, maxIterations: 120 },
};

function adaptPentest({ task, target, categories, dir, autoConfirm, manifest }) {
    const input = {};
    input.targetDir = dir ? path.resolve(dir) : process.cwd();

    // targetUrl: flag > task extraction
    input.targetUrl = (typeof target === 'string' && target) || extractUrl(task);
    if (!input.targetUrl) {
        throw new Error('Pentest butuh targetUrl. Tulis URL di --task atau pakai --target <url>.');
    }

    // categories: flag > task heuristic > default per manifest
    const catsFromFlag = parseCategoriesFlag(categories);
    const catsFromTask = task ? detectCategoriesFromText(task) : [];
    const profile = task ? detectProfileFromText(task) : null;
    const profileDefaults = profile ? PROFILES[profile] : null;

    const allCats = catsFromFlag && catsFromFlag.length ? catsFromFlag
        : (catsFromTask.length ? catsFromTask
            : (profileDefaults ? profileDefaults.categories : undefined));
    if (allCats) input.categories = allCats;

    if (profileDefaults) {
        input.perCategory = profileDefaults.perCategory;
        input.maxIterations = profileDefaults.maxIterations;
    }

    // autoConfirm: flag > manifest default
    const allowed = manifest?.policies?.autoConfirm?.modes || ['never', 'after-report', 'all'];
    if (typeof autoConfirm === 'string' && allowed.includes(autoConfirm)) {
        input.autoConfirm = autoConfirm;
    } else {
        input.autoConfirm = manifest?.policies?.autoConfirm?.default || 'after-report';
    }
    return input;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter: QA — input wajib `findings`. Kalau task minta auto-run, kita
// jalankan SecurityCode/QualityCode dulu untuk dapat findings, lalu pass.
// ─────────────────────────────────────────────────────────────────────────────

async function adaptQA({ task, dir, autoConfirm, manifest }) {
    const input = {};
    input.targetDir = dir ? path.resolve(dir) : process.cwd();

    // autoConfirm
    const allowed = manifest?.policies?.autoConfirm?.modes || ['never', 'safe-only', 'all'];
    if (typeof autoConfirm === 'string' && allowed.includes(autoConfirm)) {
        input.autoConfirm = autoConfirm;
    } else if (task) {
        const lower = task.toLowerCase();
        if (lower.includes('semua') || lower.includes('all') || lower.includes('paksa')) {
            input.autoConfirm = allowed.includes('all') ? 'all' : allowed[0];
        } else if (lower.includes('aman') || lower.includes('safe')) {
            input.autoConfirm = allowed.includes('safe-only') ? 'safe-only' : allowed[0];
        } else {
            input.autoConfirm = manifest?.policies?.autoConfirm?.default || 'never';
        }
    } else {
        input.autoConfirm = manifest?.policies?.autoConfirm?.default || 'never';
    }

    // Findings: coba auto-scan QualityCode kalau task minta "perbaiki kode" / "auto-fix"
    let findings = [];
    try {
        const scanner = require(path.resolve(__dirname, '..', '..', '..', 'src', 'modules', 'QualityCode'));
        const fn = scanner.runQualityCode || scanner.runQuality || scanner.run;
        if (typeof fn === 'function') {
            const scan = await fn(input.targetDir);
            findings = Array.isArray(scan) ? scan : (scan?.findings || []);
        }
    } catch (_) {
        // QualityCode tidak ada / gagal → biarkan findings kosong; agent QA akan handle.
    }
    input.findings = findings;

    return input;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry adapter per agent
// ─────────────────────────────────────────────────────────────────────────────

const ADAPTERS = {
    pentest: adaptPentest,
    qa: adaptQA,
};

async function runIntentParser({ agentId, manifest, task, target, categories, dir, autoConfirm, useAI, verbose }) {
    const adapter = ADAPTERS[agentId];
    if (!adapter) {
        // Generic fallback — pass task sebagai field `message` saja.
        return {
            targetDir: dir ? path.resolve(dir) : process.cwd(),
            message: task || '',
        };
    }

    let input = await adapter({ task, target, categories, dir, autoConfirm, manifest });

    // (Optional) AI augmentation — placeholder; di-skip secara default agar
    // tidak bikin LLM call diam-diam. Implementasi nyata bisa dipasang nanti
    // dengan DeepSeek lewat openclaw/agents/Pentest/lib/engine/ai.js.
    if (useAI && task) {
        if (verbose) process.stderr.write(`[intent] AI mode aktif (placeholder)\n`);
        // TODO: panggil aiModule.askJson(...) dan merge hasil ke `input`.
    }

    return input;
}

module.exports = { runIntentParser, extractUrl, detectCategoriesFromText };
