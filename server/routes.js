'use strict';

const express = require('express');
const paymentHandlers = require('./payment/handlers');
const subHandlers = require('./subscription/handlers');

function registerRoutes(app) {
    const api = express.Router();

    api.get('/plans', subHandlers.getPlans);
    api.get('/subscription/:userId', subHandlers.getSubscription);
    api.post('/subscription/:userId/deactivate', subHandlers.deactivate);

    api.post('/payment/create', paymentHandlers.createTransaction);
    api.post('/payment/webhook', paymentHandlers.handleWebhook);

    api.get('/health', (_req, res) => res.json({ ok: true, service: 'aegis-saas' }));

    app.use('/api', api);
}

module.exports = { registerRoutes };
