'use strict';

const express = require('express');
const paymentHandlers = require('./payment/handlers');
const subHandlers = require('./subscription/handlers');
const midtrans = require('./payment/midtrans');
const store = require('./subscription/store');

function registerRoutes(app) {
    const api = express.Router();

    api.get('/plans', subHandlers.getPlans);
    api.get('/subscription/:userId', subHandlers.getSubscription);
    api.post('/subscription/:userId/deactivate', subHandlers.deactivate);

    api.post('/payment/create', paymentHandlers.createTransaction);
    api.post('/payment/webhook', paymentHandlers.handleWebhook);
    api.post('/payment/dev-simulate', paymentHandlers.simulateDevPayment);

    api.get('/order/:orderId', async (req, res) => {
        const orderId = req.params.orderId;
        const localOrder = store.getOrder(orderId);

        if (!orderId.startsWith('AEG-')) {
            return res.status(400).json({
                paid: false,
                error: 'order_id tidak valid. Harus dari alur /pricing (format AEG-PRO-...).',
            });
        }

        if (localOrder?.status === 'paid') {
            const subscription = store.getSubscription(localOrder.userId);
            return res.json({ paid: true, subscription, alreadyActive: true, source: 'local' });
        }

        try {
            const status = await midtrans.getTransactionStatus(orderId);
            const paid = midtrans.isPaid(status);

            let subscription = null;
            let alreadyActive = false;

            if (paid && localOrder) {
                if (localOrder.status === 'paid') {
                    alreadyActive = true;
                    subscription = store.getSubscription(localOrder.userId);
                } else {
                    subscription = store.activateSubscription({
                        orderId,
                        paymentMeta: {
                            paymentType: status.paymentType,
                            grossAmount: status.grossAmount,
                            transactionStatus: status.transactionStatus,
                        },
                    });
                }
            }

            return res.json({
                paid,
                status,
                subscription,
                alreadyActive,
                pending: !!localOrder && localOrder.status === 'pending' && !paid,
            });
        } catch (err) {
            const msg = err.message || String(err);
            const notFound = msg.includes("doesn't exist") || msg.includes('404');
            return res.json({
                paid: false,
                pending: localOrder?.status === 'pending',
                error: notFound
                    ? 'Transaksi tidak ditemukan di Midtrans. Pastikan order_id di URL sama dengan yang dibuat saat Subscribe.'
                    : msg,
            });
        }
    });

    api.get('/health', (_req, res) => res.json({ ok: true, service: 'aegis-saas' }));

    app.use('/api', api);
}

module.exports = { registerRoutes };
