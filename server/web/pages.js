'use strict';

const BASE_HEAD = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { background:#0a0a0a; color:#e5e5e5; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  .glow { box-shadow: 0 0 40px rgba(239,68,68,.15); }
  .grain { background-image: radial-gradient(circle at 25% 25%, rgba(239,68,68,.08) 0%, transparent 50%); }
</style>
`;

function escapeHtml(s = '') {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function fmtIdr(n) {
    if (typeof n !== 'number') return n;
    return 'Rp ' + n.toLocaleString('id-ID');
}

function landing() {
    return `<!doctype html><html lang="id"><head>${BASE_HEAD}<title>Aegis — Autonomous Security</title></head>
<body class="grain min-h-screen">
  <div class="max-w-3xl mx-auto px-6 py-24 text-center">
    <h1 class="text-6xl font-black tracking-tight bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
      AEGIS
    </h1>
    <p class="mt-3 text-neutral-400">Autonomous Security Engine — Agentic Security for Modern Developers</p>

    <div class="mt-12 grid grid-cols-1 gap-3">
      <a href="/pricing" class="block px-6 py-4 rounded-xl bg-red-600 hover:bg-red-500 transition text-white font-semibold glow">
        Lihat Paket Berlangganan
      </a>
      <a href="/api/health" class="block px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-sm">
        Status server
      </a>
    </div>

    <div class="mt-16 text-xs text-neutral-600">
      Demo SaaS layer · Midtrans Sandbox · OpenClaw 2026
    </div>
  </div>
</body></html>`;
}

function pricing(plans, currency) {
    const cards = plans.map(p => {
        const featuresHtml = (p.features || [])
            .map(f => `<li class="flex items-start gap-2 text-sm text-neutral-300"><span class="text-red-500 mt-1">✓</span>${escapeHtml(f)}</li>`)
            .join('');
        const highlight = p.highlighted ? 'border-red-500 glow' : 'border-neutral-800';
        const ctaLabel = p.priceIdr === 0 ? 'Pakai Gratis' : 'Subscribe';
        const ctaClass = p.priceIdr === 0
            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            : 'bg-red-600 hover:bg-red-500 text-white';
        const ctaDisabled = p.priceIdr === 0 ? 'disabled' : '';
        return `
        <div class="rounded-2xl border-2 ${highlight} bg-neutral-950/50 p-6 flex flex-col">
            <div class="text-xs uppercase tracking-widest text-neutral-500">${escapeHtml(p.id)}</div>
            <div class="mt-1 text-2xl font-bold text-white">${escapeHtml(p.name)}</div>
            <div class="text-neutral-400 text-sm mt-1">${escapeHtml(p.tagline || '')}</div>
            <div class="mt-6 text-3xl font-extrabold text-white">
                ${p.priceIdr === 0 ? 'Gratis' : fmtIdr(p.priceIdr)}
                ${p.priceIdr > 0 ? '<span class="text-sm font-normal text-neutral-500"> / bulan</span>' : ''}
            </div>
            <ul class="mt-6 space-y-2 flex-1">${featuresHtml}</ul>
            <button onclick="subscribe('${escapeHtml(p.id)}')" ${ctaDisabled}
                class="mt-8 w-full py-3 rounded-xl font-semibold transition ${ctaClass} disabled:opacity-50 disabled:cursor-not-allowed">
                ${ctaLabel}
            </button>
        </div>`;
    }).join('');

    return `<!doctype html><html lang="id"><head>${BASE_HEAD}<title>Aegis — Paket Berlangganan</title></head>
<body class="grain min-h-screen">
  <div class="max-w-6xl mx-auto px-6 py-16">
    <div class="text-center mb-12">
      <a href="/" class="text-xs text-neutral-500 hover:text-neutral-300">← kembali</a>
      <h1 class="mt-4 text-4xl font-extrabold text-white">Pilih paket Aegis</h1>
      <p class="mt-2 text-neutral-400">Harga dalam ${escapeHtml(currency || 'IDR')} — dapat dibatalkan kapan saja.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${cards}</div>
    <div id="status" class="mt-8 text-center text-sm text-neutral-500"></div>
  </div>

<script>
async function subscribe(planId) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Membuat transaksi...';
    try {
        const res = await fetch('/api/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'demo-user', planId }),
        });
        const data = await res.json();
        if (!res.ok) {
            statusEl.textContent = 'Error: ' + (data.error || 'unknown');
            return;
        }
        statusEl.innerHTML = 'Order <code>' + data.orderId + '</code> dibuat. Redirecting ke Midtrans...';
        window.location.href = data.redirectUrl;
    } catch (e) {
        statusEl.textContent = 'Network error: ' + e.message;
    }
}
</script>
</body></html>`;
}

function successPage({ orderId, subscription, status, paid, alreadyActive, errorMsg }) {
    const showError = errorMsg
        ? `<div class="mt-6 p-4 rounded-xl bg-red-950/50 border border-red-900 text-red-300 text-sm break-words">${escapeHtml(errorMsg)}</div>`
        : '';

    const orderNotYetTouched = errorMsg && /transaction doesn't exist|404/i.test(errorMsg);

    let body = '';
    if (paid && subscription) {
        body = `
        <div class="text-center">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/50 mb-6">
                <span class="text-4xl">✓</span>
            </div>
            <h1 class="text-3xl font-extrabold text-white">Pembayaran Berhasil</h1>
            <p class="mt-2 text-neutral-400">Akun kamu sekarang ${escapeHtml(subscription.planName)}.</p>
        </div>

        <div class="mt-10 rounded-2xl bg-neutral-950 border border-neutral-800 p-6 space-y-4">
            <div>
                <div class="text-xs uppercase tracking-widest text-neutral-500">License Key</div>
                <div class="mt-1 font-mono text-lg text-red-400 select-all">${escapeHtml(subscription.licenseKey)}</div>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div><div class="text-neutral-500">Tier</div><div class="text-white">${escapeHtml(subscription.tier)}</div></div>
                <div><div class="text-neutral-500">AI Backend</div><div class="text-white">${escapeHtml((subscription.limits && subscription.limits.aiBackend) || '-')}</div></div>
                <div><div class="text-neutral-500">Order ID</div><div class="text-white font-mono text-xs">${escapeHtml(orderId)}</div></div>
                <div><div class="text-neutral-500">Berlaku Sampai</div><div class="text-white">${escapeHtml(subscription.expiresAt || '-')}</div></div>
            </div>
            ${alreadyActive ? '<div class="text-xs text-neutral-500 italic">Subscription sudah aktif sebelumnya — tidak ada perubahan.</div>' : ''}
        </div>

        <div class="mt-8 rounded-2xl bg-neutral-950 border border-neutral-800 p-6">
            <div class="text-xs uppercase tracking-widest text-neutral-500 mb-3">Cara Pakai di CLI</div>
            <pre class="bg-black/50 p-4 rounded-lg text-xs text-green-300 overflow-auto"><code># Aktifkan tier Pro di CLI
$env:AEGIS_LICENSE = "${escapeHtml(subscription.licenseKey)}"
aegis QA --auto safe-only</code></pre>
        </div>
        `;
    } else if (status) {
        body = `
        <div class="text-center">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/50 mb-6">
                <span class="text-3xl">⌛</span>
            </div>
            <h1 class="text-3xl font-extrabold text-white">Belum Selesai</h1>
            <p class="mt-2 text-neutral-400">Status transaksi: <strong>${escapeHtml(status.transactionStatus || 'unknown')}</strong></p>
        </div>
        <div class="mt-8 text-center">
            <a href="/pricing" class="text-red-400 hover:text-red-300 text-sm">Coba transaksi baru</a>
        </div>`;
    } else if (orderId && orderNotYetTouched) {
        body = `
        <div class="text-center">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 border-2 border-blue-500/50 mb-6">
                <span class="text-3xl">↻</span>
            </div>
            <h1 class="text-3xl font-extrabold text-white">Transaksi Belum Diproses</h1>
            <p class="mt-2 text-neutral-400">Order <code class="font-mono text-xs bg-neutral-900 px-2 py-1 rounded">${escapeHtml(orderId)}</code> sudah dibuat, tapi belum ada pembayaran yang masuk.</p>
            <p class="mt-1 text-neutral-500 text-sm">Selesaikan dulu pembayaran via popup Midtrans, lalu refresh halaman ini.</p>
        </div>
        <div class="mt-8 text-center">
            <a href="/pricing" class="text-red-400 hover:text-red-300 text-sm">Coba transaksi baru →</a>
        </div>`;
    } else if (orderId) {
        body = `
        <div class="text-center">
            <h1 class="text-2xl font-extrabold text-white">Gagal Mengambil Status</h1>
            <p class="mt-2 text-neutral-400">Order ID: <code class="font-mono text-xs">${escapeHtml(orderId)}</code></p>
        </div>`;
    } else {
        body = `
        <div class="text-center">
            <h1 class="text-2xl font-extrabold text-white">Tidak ada order_id</h1>
            <p class="mt-2 text-neutral-400">Halaman ini biasanya dibuka setelah pembayaran via Midtrans.</p>
            <div class="mt-8"><a href="/pricing" class="text-red-400 hover:text-red-300">Lihat paket</a></div>
        </div>`;
    }

    return `<!doctype html><html lang="id"><head>${BASE_HEAD}<title>Aegis — Pembayaran</title></head>
<body class="grain min-h-screen">
  <div class="max-w-2xl mx-auto px-6 py-16">
    <a href="/" class="text-xs text-neutral-500 hover:text-neutral-300">← kembali ke beranda</a>
    <div class="mt-8">${body}</div>
    ${showError}
  </div>
</body></html>`;
}

module.exports = { landing, pricing, successPage };
