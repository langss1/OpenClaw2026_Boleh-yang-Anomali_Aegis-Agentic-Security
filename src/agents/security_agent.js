'use strict';

/**
 * SecurityAgent — SAST scanner berbasis aturan (rule-based).
 *
 * Aturan terstruktur: setiap rule = { id, issue, severity, cwe, pattern,
 * description, fix, applies(filePath) }. Eksekusi line-by-line dengan
 * dedup signature untuk hindari duplikasi false-positive di file panjang.
 *
 * Kategori deteksi (OWASP-aligned):
 *   • Hardcoded secrets (file kode + file .env / .env.local)
 *   • SQL injection (template-literal & string-concat)
 *   • Command injection (exec/spawn/execSync + concat user input)
 *   • XSS (res.send, innerHTML, document.write, dangerouslySetInnerHTML)
 *   • Code injection (eval, new Function)
 *   • Path traversal (fs.readFile/createReadStream + req.query/body)
 *   • Open redirect (res.redirect dgn nilai user-controlled)
 *   • Weak crypto (md5, sha1 untuk password/auth)
 *   • Weak randomness (Math.random untuk token/secret)
 *   • Insecure deserialization (JSON.parse dari req.body langsung — info)
 *   • SSRF surface (axios/fetch dgn URL dari req.query/body)
 */

const BaseAgent = require('../core/base_agent');
const fs = require('fs-extra');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// SECRET PATTERNS — dipakai untuk file kode (.js/.ts/.py) maupun .env
// ─────────────────────────────────────────────────────────────────────────────
const SECRET_KEYWORD = /(password|passwd|pwd|secret|api[_-]?key|access[_-]?key|private[_-]?key|token|auth|bearer|jwt|session|sb_|sk_|aws|gcp_)/i;
const HIGH_ENTROPY_PREFIX = /\b(AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z\-_]{20,}|sk-[A-Za-z0-9]{16,}|sk_live_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[abprs]-[0-9A-Za-z\-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
const PLACEHOLDER = /^(your[-_ ]?|example|changeme|placeholder|xxx|<.*>|todo|fixme|null|undefined)$/i;

// ─────────────────────────────────────────────────────────────────────────────
// RULES — dievaluasi per-line
// ─────────────────────────────────────────────────────────────────────────────
const RULES = [
    // ── SQL INJECTION ────────────────────────────────────────────────────────
    {
        id: 'sqli-template-literal',
        issue: 'SQL Injection (template literal)',
        severity: 'High',
        cwe: 'CWE-89',
        test: (line) => /(query|select|insert|update|delete)\b[^;]*`[^`]*\$\{[^}]+\}[^`]*`/i.test(line),
        description: 'Query SQL menggunakan template literal dengan interpolasi langsung — gunakan parameterized query.',
        fix: '// gunakan db.query(sql, [params]) atau ORM yang aman',
    },
    {
        id: 'sqli-string-concat',
        issue: 'SQL Injection (string concat)',
        severity: 'High',
        cwe: 'CWE-89',
        test: (line) => /\b(query|sql|select|insert|update|delete|where)\b[^;]*['"][^'"]*['"]\s*\+\s*\w+/i.test(line)
                     || /['"][^'"]*\b(select|insert|update|delete|from|where)\b[^'"]*['"]\s*\+/i.test(line),
        description: 'Query SQL dibangun lewat concat dengan variabel — rawan SQL injection.',
        fix: '// gunakan parameterized query / prepared statement',
    },

    // ── COMMAND INJECTION ────────────────────────────────────────────────────
    {
        id: 'cmdi-exec-concat',
        issue: 'OS Command Injection (exec/spawn concat)',
        severity: 'Critical',
        cwe: 'CWE-78',
        test: (line) => /\b(child_process\.)?(exec|execSync|spawn|spawnSync)\s*\(\s*['"`][^'"`]*['"`]\s*\+/i.test(line)
                     || /\b(child_process\.)?(exec|execSync|spawn|spawnSync)\s*\(\s*`[^`]*\$\{/i.test(line),
        description: 'exec/spawn dipanggil dengan string yang di-concat — eksekusi shell dengan input tidak aman.',
        fix: '// gunakan execFile()/spawn(cmd, [args]) tanpa shell, atau whitelist input ketat',
    },
    {
        id: 'cmdi-exec-userinput',
        issue: 'OS Command Injection (exec + req.*)',
        severity: 'Critical',
        cwe: 'CWE-78',
        test: (line) => /\b(exec|execSync|spawn)\s*\([^)]*\b(req\.(query|body|params|cookies)|process\.argv)/i.test(line),
        description: 'exec/spawn menerima nilai langsung dari req.* — peluang attacker eksekusi command arbitrer.',
        fix: '// validasi/whitelist input, pakai execFile() tanpa shell',
    },

    // ── CODE INJECTION ───────────────────────────────────────────────────────
    {
        id: 'code-eval',
        issue: 'Code Injection (eval)',
        severity: 'Critical',
        cwe: 'CWE-95',
        test: (line) => /\beval\s*\(/.test(line) && !/\/\/.*eval/.test(line),
        description: 'eval() dapat mengeksekusi string sebagai kode JS — sangat berbahaya bila input dari user.',
        fix: '// hapus eval; gunakan JSON.parse / lookup-table / function dispatch',
    },
    {
        id: 'code-new-function',
        issue: 'Code Injection (new Function)',
        severity: 'High',
        cwe: 'CWE-95',
        test: (line) => /new\s+Function\s*\(/.test(line),
        description: 'new Function() setara eval — bisa eksekusi string sembarang.',
        fix: '// hindari Function constructor; pakai logic yang eksplisit',
    },

    // ── XSS ─────────────────────────────────────────────────────────────────
    {
        id: 'xss-res-send-concat',
        issue: 'Reflected XSS (res.send concat)',
        severity: 'High',
        cwe: 'CWE-79',
        test: (line) => /\bres\.(send|write|end)\s*\(\s*['"`<][^)]*\+[^)]*\b(req\.(query|body|params)|name|input)\b/i.test(line)
                     || /\bres\.(send|write|end)\s*\(\s*`[^`]*\$\{[^}]*\b(req\.(query|body|params))/i.test(line),
        description: 'Response body dirakit dari nilai user — potensi reflected XSS.',
        fix: '// escape HTML dgn library (e.g. he, dompurify) sebelum di-render',
    },
    {
        id: 'xss-innerhtml',
        issue: 'DOM XSS (innerHTML)',
        severity: 'High',
        cwe: 'CWE-79',
        test: (line) => /\.innerHTML\s*=\s*[^;]*(\+|`[^`]*\$\{)/.test(line)
                     || /\.outerHTML\s*=\s*[^;]*(\+|`[^`]*\$\{)/.test(line),
        description: 'Assignment ke innerHTML dengan data dinamis — XSS sink.',
        fix: '// pakai textContent atau library escaping',
    },
    {
        id: 'xss-document-write',
        issue: 'DOM XSS (document.write)',
        severity: 'High',
        cwe: 'CWE-79',
        test: (line) => /document\.write(ln)?\s*\(/.test(line),
        description: 'document.write dengan data dinamis — XSS sink + bisa hijack DOM.',
        fix: '// hindari document.write; manipulasi DOM via createElement + textContent',
    },
    {
        id: 'xss-dangerously-set-inner-html',
        issue: 'React XSS (dangerouslySetInnerHTML)',
        severity: 'High',
        cwe: 'CWE-79',
        test: (line) => /dangerouslySetInnerHTML\s*=\s*\{/.test(line),
        description: 'dangerouslySetInnerHTML harus selalu dgn HTML yang sudah di-sanitize.',
        fix: '// sanitize dgn DOMPurify sebelum di-pass',
    },

    // ── PATH TRAVERSAL ───────────────────────────────────────────────────────
    {
        id: 'path-traversal',
        issue: 'Path Traversal',
        severity: 'High',
        cwe: 'CWE-22',
        test: (line) => /\bfs\.(readFile|readFileSync|createReadStream|writeFile|writeFileSync|unlink)\s*\([^)]*\b(req\.(query|body|params)|process\.argv)/i.test(line)
                     || /\bres\.sendFile\s*\([^)]*\b(req\.(query|body|params))/i.test(line),
        description: 'Operasi file menerima nilai user langsung — peluang traversal `../../etc/passwd`.',
        fix: '// validasi path dgn path.normalize + cek prefix di safe-root',
    },

    // ── OPEN REDIRECT ───────────────────────────────────────────────────────
    {
        id: 'open-redirect',
        issue: 'Open Redirect',
        severity: 'Medium',
        cwe: 'CWE-601',
        test: (line) => /\bres\.redirect\s*\([^)]*\b(req\.(query|body|params)|process\.argv)/i.test(line),
        description: 'res.redirect menerima URL dari user — bisa dipakai phishing.',
        fix: '// whitelist host tujuan atau pakai redirect map id→url',
    },

    // ── SSRF SURFACE ────────────────────────────────────────────────────────
    {
        id: 'ssrf-fetch',
        issue: 'SSRF Surface (fetch/axios user URL)',
        severity: 'High',
        cwe: 'CWE-918',
        test: (line) => /\b(fetch|axios(\.(get|post|put|delete|head|request))?)\s*\(\s*[^)]*\b(req\.(query|body|params))/i.test(line),
        description: 'HTTP client memanggil URL yang berasal dari user — risiko SSRF (akses metadata cloud, internal services).',
        fix: '// whitelist domain/IP, blok 169.254.169.254 & 127.0.0.0/8 & 10.0.0.0/8',
    },

    // ── WEAK CRYPTO / RANDOMNESS ─────────────────────────────────────────────
    {
        id: 'crypto-md5-sha1',
        issue: 'Weak Cryptographic Hash (MD5/SHA1)',
        severity: 'Medium',
        cwe: 'CWE-327',
        test: (line) => /createHash\s*\(\s*['"]\s*(md5|sha1)\s*['"]/i.test(line),
        description: 'MD5/SHA1 lemah untuk hashing kredensial atau integrity.',
        fix: '// gunakan SHA-256/512 untuk hash, bcrypt/argon2id untuk password',
    },
    {
        id: 'random-math-token',
        issue: 'Weak Randomness (Math.random for token)',
        severity: 'Medium',
        cwe: 'CWE-330',
        test: (line) => /Math\.random\s*\(\s*\)/.test(line) && /(token|secret|key|password|nonce|otp|reset)/i.test(line),
        description: 'Math.random tidak cryptographically secure — jangan untuk token/secret.',
        fix: "// pakai crypto.randomBytes(n).toString('hex')",
    },

    // ── INSECURE DESERIALIZATION (info) ──────────────────────────────────────
    {
        id: 'deser-jsonparse-body',
        issue: 'Untrusted JSON Parse (info)',
        severity: 'Low',
        cwe: 'CWE-502',
        test: (line) => /JSON\.parse\s*\(\s*req\.(body|query|params|cookies)/i.test(line),
        description: 'JSON.parse langsung dari req.* — lampirkan validasi schema (Zod/Joi/AJV).',
        fix: '// validate dgn JSON schema sebelum di-pakai',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// SecurityAgent
// ─────────────────────────────────────────────────────────────────────────────
class SecurityAgent extends BaseAgent {
    constructor(targetDir) {
        super('Security', targetDir);
        this.findings = [];
        this._seen = new Set(); // dedup signature
    }

    async run() {
        this.log('Memulai pemindaian kode (SAST)...', '\x1b[33m');
        this.scan(this.targetDir);

        const reportRel = 'logs/Security_Code/REPORT_Security_Code.md';
        const summary = this.summarize();
        let reportContent = `# 🔍 AEGIS SECURITY CODE REPORT - ${new Date().toLocaleString()}\n\n`;
        reportContent += `> Fokus: kerentanan keamanan (SAST) — **bukan** kualitas/hygiene kode (gunakan QA / QualityCode).\n\n`;
        reportContent += `## Ringkasan\n\n`;
        reportContent += `| Severity | Jumlah |\n|----------|-------|\n`;
        for (const sev of ['Critical', 'High', 'Medium', 'Low']) {
            reportContent += `| ${sev} | ${summary[sev] || 0} |\n`;
        }
        reportContent += `\n**Total: ${this.findings.length}**\n\n`;

        if (this.findings.length > 0) {
            reportContent += `## Detail Findings\n\n`;
            this.findings.forEach((f, idx) => {
                reportContent += `### ${idx + 1}. ${f.issue} (${f.severity})\n`;
                reportContent += `- **CWE:** ${f.cwe || '-'}\n`;
                reportContent += `- **File:** \`${f.file}:${f.line}\`\n`;
                reportContent += `- **Deskripsi:** ${f.description}\n`;
                reportContent += `- **Kode:** \`${f.currentCode.slice(0, 200)}\`\n`;
                if (f.fixedCode) reportContent += `- **Saran fix:** \`${f.fixedCode}\`\n`;
                reportContent += `\n`;
            });
        } else {
            reportContent += `✅ Tidak ditemukan kerentanan keamanan kritis.\n`;
        }

        const reportPath = path.join(this.targetDir, reportRel);
        await fs.ensureDir(path.dirname(reportPath));
        await fs.outputFile(reportPath, reportContent);

        const color = this.findings.length > 0 ? '\x1b[31m' : '\x1b[32m';
        this.log(`Pemindaian keamanan selesai. Ditemukan ${this.findings.length} celah.`, color);
        if (this.findings.length > 0) {
            const breakdown = ['Critical', 'High', 'Medium', 'Low']
                .map((s) => `${s}: ${summary[s] || 0}`).join(' · ');
            this.log(`Breakdown: ${breakdown}`, '\x1b[90m');
        }
        this.log(`Laporan: ${reportRel}`, '\x1b[90m');
        return this.findings;
    }

    summarize() {
        const out = {};
        for (const f of this.findings) {
            out[f.severity] = (out[f.severity] || 0) + 1;
        }
        return out;
    }

    scan(dir) {
        const ignore = [
            'node_modules', '.git', '.next', 'dist', 'build', '.cache',
            'docs', 'backups', 'logs', 'openclaw', 'coverage', '.vscode',
        ];
        let items;
        try {
            items = fs.readdirSync(dir);
        } catch (_) {
            return;
        }

        for (const item of items) {
            if (ignore.includes(item)) continue;
            const fullPath = path.join(dir, item);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch (_) {
                continue;
            }

            if (stat.isDirectory()) {
                this.scan(fullPath);
                continue;
            }

            const ext = path.extname(item).toLowerCase();
            const base = item.toLowerCase();

            // File env: .env, .env.local, .env.production, env.example dst.
            const isEnvFile = base === '.env'
                || base.startsWith('.env.')
                || base === 'env'
                || base.endsWith('.env');

            if (isEnvFile) {
                this.analyzeEnvFile(fullPath);
                continue;
            }

            // File source code yang di-scan
            if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.rb', '.go', '.php'].includes(ext)) {
                this.analyzeCodeFile(fullPath);
            }
        }
    }

    /**
     * Scan file source code: secret detection + rule-based vulnerability scan.
     */
    analyzeCodeFile(filePath) {
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch (_) {
            return;
        }
        const lines = content.split('\n');

        lines.forEach((line, i) => {
            const trimLine = line.trim();
            // Skip baris kosong / komentar penuh
            if (!trimLine || /^(\s*\/\/|\s*#|\s*\/\*|\s*\*)/.test(trimLine)) return;

            // ── secret detection (deklarasi const X = "..." atau key: "value") ──
            this.checkSecretInCode(filePath, i + 1, line, trimLine);

            // ── rule-based vulnerability scan ──
            for (const rule of RULES) {
                try {
                    if (rule.test(line)) {
                        this.pushFinding({
                            file: path.relative(this.targetDir, filePath),
                            line: i + 1,
                            ruleId: rule.id,
                            issue: rule.issue,
                            severity: rule.severity,
                            cwe: rule.cwe,
                            currentCode: trimLine,
                            fixedCode: rule.fix,
                            description: rule.description,
                        });
                    }
                } catch (_) { /* abaikan rule yang error */ }
            }
        });
    }

    /**
     * Scan .env / .env.* file: format KEY=VALUE (boleh quoted maupun tidak).
     * KEY mendukung huruf kecil + angka (jwt_secret, apiKey, dll).
     */
    analyzeEnvFile(filePath) {
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch (_) {
            return;
        }
        const lines = content.split('\n');

        lines.forEach((line, i) => {
            const trimLine = line.trim();
            // skip blank & komentar
            if (!trimLine || trimLine.startsWith('#')) return;

            const m = trimLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
            if (!m) return;

            const key = m[1];
            let value = m[2].trim();
            if ((value.startsWith('"') && value.endsWith('"'))
                || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            value = value.replace(/\s+#.*$/, '');

            if (!value || value.length < 6) return;
            if (PLACEHOLDER.test(value)) return;

            const isSecretKey = SECRET_KEYWORD.test(key);
            const isHighEntropy = HIGH_ENTROPY_PREFIX.test(value)
                || (value.length >= 20 && /[A-Za-z0-9]/.test(value)
                    && /[^A-Za-z\s]/.test(value) && !/\s/.test(value));

            if (!isSecretKey && !isHighEntropy) return;

            const isExample = /\.env\.example$/i.test(filePath) || /\.env\.sample$/i.test(filePath);
            const severity = isExample ? 'Medium' : 'Critical';
            const note = isExample
                ? '(file example — pastikan nilai placeholder, jangan kredensial asli)'
                : '(file .env asli ter-commit — segera rotate & masukkan ke .gitignore)';

            this.pushFinding({
                file: path.relative(this.targetDir, filePath),
                line: i + 1,
                ruleId: 'secret-env-file',
                issue: 'Hardcoded Sensitive Data (.env)',
                severity,
                cwe: 'CWE-798',
                currentCode: trimLine,
                fixedCode: `${key}=<MASUKKAN_VIA_SECRET_MANAGER>`,
                description: `Secret terdeteksi di file env: ${key} ${note}`,
            });
        });
    }

    /**
     * Deteksi secret dalam file source code (regex pada deklarasi).
     */
    checkSecretInCode(filePath, lineNo, fullLine, trimLine) {
        const keywordMatch = fullLine.match(SECRET_KEYWORD);
        const valueMatch = fullLine.match(/[:=]\s*['"`]([^'"`]+)['"`]/);
        const entropyMatch = fullLine.match(HIGH_ENTROPY_PREFIX);

        let value = null;
        let reason = null;

        if (entropyMatch) {
            value = entropyMatch[0];
            reason = 'Pattern token vendor terdeteksi (AWS/Google/OpenAI/GitHub/Slack/dll).';
        } else if (keywordMatch && valueMatch && valueMatch[1].length > 8
                   && !PLACEHOLDER.test(valueMatch[1])
                   && !/^process\./.test(valueMatch[1])
                   && !/^require\(/.test(valueMatch[1])) {
            value = valueMatch[1];
            reason = 'Kata kunci sensitif + literal string panjang.';
        }

        if (!value) return;

        const keyName = (keywordMatch && keywordMatch[0]) || 'SECRET';
        this.pushFinding({
            file: path.relative(this.targetDir, filePath),
            line: lineNo,
            ruleId: 'secret-hardcoded-source',
            issue: 'Hardcoded Sensitive Data',
            severity: 'Critical',
            cwe: 'CWE-798',
            currentCode: trimLine,
            fixedCode: fullLine.replace(/['"`][^'"`]+['"`]/, `process.env.${keyName.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`),
            description: `Kredensial hardcoded — ${reason}`,
        });
    }

    pushFinding(f) {
        const sig = `${f.file}:${f.line}:${f.ruleId || f.issue}`;
        if (this._seen.has(sig)) return;
        this._seen.add(sig);
        this.findings.push({
            category: 'security',
            ...f,
        });
    }
}

module.exports = SecurityAgent;
