'use strict';

const { cfg } = require('../config');
const store = require('./store');

function getPlans(_req, res) {
    return res.json({
        currency: cfg.currency,
        plans: cfg.plans,
    });
}

function getSubscription(req, res) {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ error: 'userId wajib di path.' });
    const sub = store.getSubscription(userId);
    return res.json(sub);
}

function deactivate(req, res) {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ error: 'userId wajib di path.' });
    const result = store.deactivate(userId);
    if (!result) return res.status(404).json({ error: 'User tidak ditemukan.' });
    return res.json({ ok: true, subscription: result });
}

module.exports = { getPlans, getSubscription, deactivate };
