#!/usr/bin/env node
'use strict';

try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

const express = require('express');
const { cfg, isMidtransConfigured } = require('./config');
const { registerRoutes } = require('./routes');

function createApp() {
    const app = express();

    app.use(express.json({ limit: '1mb' }));
    app.use((req, _res, next) => {
        const ts = new Date().toISOString();
        console.log(`\x1b[90m[${ts}]\x1b[0m ${req.method} ${req.url}`);
        next();
    });

    registerRoutes(app);

    app.use((_req, res) => res.status(404).json({ error: 'Route tidak ditemukan.' }));

    app.use((err, _req, res, _next) => {
        console.error('[SERVER ERROR]', err.message);
        res.status(500).json({ error: err.message });
    });

    return app;
}

function start() {
    const app = createApp();
    app.listen(cfg.port, cfg.host, () => {
        const bind = `${cfg.host}:${cfg.port}`;
        console.log(`\n\x1b[32m[AEGIS SaaS]\x1b[0m bound to ${bind}`);
        console.log(`  Web URL   : ${cfg.publicUrl}  (Next.js — npm run web:dev)`);
        console.log(`  Midtrans  : ${isMidtransConfigured() ? `configured (${cfg.midtrans.isProduction ? 'PRODUCTION' : 'sandbox'})` : '\x1b[33mNOT CONFIGURED\x1b[0m'}`);
        console.log(`  Plans     : ${cfg.plans.map(p => p.id).join(', ')}`);
        console.log(`  API       :`);
        console.log(`    GET  /api/health`);
        console.log(`    GET  /api/plans`);
        console.log(`    GET  /api/subscription/:userId`);
        console.log(`    GET  /api/order/:orderId`);
        console.log(`    POST /api/payment/create        body={ userId, planId }`);
        console.log(`    POST /api/payment/webhook       (Midtrans notification)\n`);
    });
}

if (require.main === module) start();

module.exports = { createApp, start };
