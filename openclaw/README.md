# `openclaw` CLI — Aegis Edition

Shim CLI lokal yang mengeksekusi Aegis agents dengan pola perintah ala OpenClaw.

> **Catatan kompat:** OpenClaw resmi pakai `openclaw agent --agent <id> --message "..."`
> (lihat [docs.openclaw.ai/cli/agent](https://docs.openclaw.ai/cli/agent)). Shim ini
> meniru pola itu tapi tambahkan opsi `--task` & `--input` untuk pengalaman lebih
> dekat dengan "free-text → agent" tanpa harus terhubung ke Gateway penuh. Adapter
> di `openclaw/lib/cli/intent.js` menerjemahkan task ke input terstruktur sesuai
> manifest tiap agent (`io.input`).

## Install

Setelah `npm install` di root project, `npm link` akan memasang binary `openclaw`
secara global (jika diizinkan):

```bash
npm install
sudo npm link   # bikin perintah 'openclaw' global
openclaw help
```

Atau panggil langsung tanpa link:
```bash
node openclaw/bin/openclaw.js help
```

## Perintah

### `openclaw list`
Lihat semua agent yang terdaftar (auto-discover dari `openclaw/agents/*/agent.json`).

```bash
$ openclaw list
Agent terdaftar (2):
  • Aegis Pentest Agent (pentest)
    version: 1.0.0    role: Dynamic Security Tester
    scope:   pentest-only    handler: runPentestAgent
  • Aegis QA Agent (qa)
    version: 1.1.0    role: Auto-Fix Specialist
    scope:   qa-only    handler: runQAAgent
```

### `openclaw describe --agent <name>`
Tampilkan manifest agent (input contract, autoConfirm modes, dll).

```bash
openclaw describe --agent pentest
```

### `openclaw run --agent <name> ...`
Jalankan agent. Pilih salah satu cara untuk supply input:

| Opsi | Kapan dipakai | Presisi |
| :--- | :--- | :--- |
| `--task "<free-text>"` | UX paling natural — bahasa alami | sedang (regex) |
| `--input '<json>'` | CI / scripted invocation | tinggi (literal) |
| `--target <url>` (+ flags) | shortcut Pentest | sedang |

#### Contoh

```bash
# Free-text → intent parser
openclaw run --agent pentest --task "scan http://localhost:3000 untuk SQLi cepat"

# JSON terstruktur — bypass parser
openclaw run --agent pentest \
  --input '{"targetUrl":"http://127.0.0.1:3000","categories":["A03"],"perCategory":3,"autoConfirm":"never"}'

# Flag-based shortcut
openclaw run --agent pentest \
  --target http://127.0.0.1:3000 \
  --categories A01,A03 \
  --auto-confirm never \
  -v

# QA agent (auto-discover findings dari QualityCode SAST)
openclaw run --agent qa --task "perbaiki kode di . secara aman"
```

## Bagaimana intent parser bekerja

Regex heuristic (tanpa LLM call), per-agent adapter di
[`openclaw/lib/cli/intent.js`](./lib/cli/intent.js):

### Pentest adapter
| Yang diekstrak | Bagaimana |
| :--- | :--- |
| `targetUrl` | regex URL `http(s)://...`, atau `localhost`/`127.x`/RFC1918 IP tanpa scheme → diberi `http://` |
| `categories` | keyword match: `sqli/injection`→A03, `access/idor`→A01, `auth/login`→A07, `ssrf/redirect`→A10, dll |
| `profile` | kata `cepat/quick` → quick (perCategory=3, maxIter=20); `dalam/deep` → deep (per=8, max=120) |
| `autoConfirm` | flag `--auto-confirm`; default dari manifest |

### QA adapter
| Yang diekstrak | Bagaimana |
| :--- | :--- |
| `targetDir` | flag `--dir`, default `cwd` |
| `findings` | otomatis dijalankan `src/modules/QualityCode.run(targetDir)` |
| `autoConfirm` | kata `semua/all/paksa` → `all`; `aman/safe` → `safe-only`; default manifest |

Override sembarang field via `--input` (lihat di atas).

## Output

- **TTY (default)**: banner + summary berwarna, event timeline jika `-v`.
- **JSON (`--json`)**: stdout JSON `{ ok, agent, elapsedMs, result, events? }` untuk parsing CI.

## Mapping ke OpenClaw resmi

Saat Anda siap migrasi ke OpenClaw Gateway resmi:

```jsonc
// ~/.openclaw/openclaw.json
{
  "agents": {
    "list": [
      {
        "id": "aegis-pentest",
        "entry": "<repo>/openclaw/agents/Pentest/index.js",
        "handler": "runPentestAgent"
      },
      {
        "id": "aegis-qa",
        "entry": "<repo>/openclaw/agents/QA/index.js",
        "handler": "runQAAgent"
      }
    ]
  }
}
```

Kemudian:
```bash
openclaw agent --agent aegis-pentest --message "scan localhost:3000"
```

(Gateway akan butuh adapter free-text → structured input — kita bisa pasang
`runIntentParser` dari shim ini sebagai middleware.)
