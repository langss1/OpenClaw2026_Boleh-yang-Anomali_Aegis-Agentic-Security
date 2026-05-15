'use strict';

const fs = require('fs');
const path = require('path');

const PLANS = JSON.parse(fs.readFileSync(path.join(__dirname, 'plans.json'), 'utf8'));

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';
const publicUrl = (process.env.AEGIS_PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, '');

const cfg = {
    port,
    host,
    publicUrl,

    midtrans: {
        isProduction: process.env.MIDTRANS_PRODUCTION === 'true',
        serverKey: process.env.MIDTRANS_SERVER_KEY || '',
        clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
        finishUrl: process.env.MIDTRANS_FINISH_URL || `${publicUrl}/success`,
    },

    storage: {
        dataDir: path.join(__dirname, 'subscription', 'data'),
        subscriptionsFile: 'subscriptions.json',
    },

    plans: PLANS.plans,
    currency: PLANS.currency,
};

function getPlanById(id) {
    return cfg.plans.find(p => p.id === id) || null;
}

function isMidtransConfigured() {
    return !!(cfg.midtrans.serverKey && cfg.midtrans.clientKey);
}

module.exports = { cfg, getPlanById, isMidtransConfigured };
