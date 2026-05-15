'use strict';

const { cfg, getPlanById, isMidtransConfigured } = require('../config');
const midtrans = require('./midtrans');
const store = require('../subscription/store');

async function createTransaction(req, res) {
    try {
        const { userId, planId, customerEmail } = req.body || {};

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'userId wajib (string).' });
        }
        if (!planId || typeof planId !== 'string') {
            return res.status(400).json({ error: 'planId wajib (string).' });
        }

        const plan = getPlanById(planId);
        if (!plan) {
            return res.status(400).json({
                error: `Plan "${planId}" tidak ditemukan.`,
                availablePlans: cfg.plans.map(p => p.id),
            });
        }

        if (plan.priceIdr === 0) {
            return res.status(400).json({
                error: 'Plan gratis tidak perlu transaksi. Akses langsung via GET /api/subscription/' + userId,
            });
        }

        if (!isMidtransConfigured()) {
            return res.status(503).json({
                error: 'Midtrans belum dikonfigurasi. Set MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY.',
                hint: 'Register sandbox: https://dashboard.sandbox.midtrans.com',
            });
        }

        const orderId = store.generateOrderId(plan.id);
        store.createPendingOrder({ userId, planId: plan.id, orderId });

        const txn = await midtrans.createSnapTransaction({
            orderId,
            plan,
            userId,
            customerEmail,
        });

        return res.json({
            ok: true,
            orderId,
            planId: plan.id,
            planName: plan.name,
            priceIdr: plan.priceIdr,
            snapToken: txn.snapToken,
            redirectUrl: txn.redirectUrl,
            sandbox: !cfg.midtrans.isProduction,
        });
    } catch (err) {
        console.error('[PAYMENT] createTransaction error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

async function handleWebhook(req, res) {
    try {
        const payload = req.body;
        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ error: 'Payload notification tidak valid.' });
        }

        const verified = await midtrans.verifyNotification(payload);
        const order = store.getOrder(verified.orderId);

        if (!order) {
            console.warn(`[PAYMENT] Webhook untuk order tidak dikenal: ${verified.orderId}`);
            return res.status(200).json({ ok: true, ignored: true });
        }

        if (midtrans.isPaid(verified)) {
            const subscription = store.activateSubscription({
                orderId: verified.orderId,
                paymentMeta: {
                    paymentType: verified.paymentType,
                    grossAmount: verified.grossAmount,
                    transactionStatus: verified.transactionStatus,
                },
            });
            console.log(`[PAYMENT] Subscription aktif: user=${subscription.userId} tier=${subscription.tier} license=${subscription.licenseKey}`);
        } else {
            console.log(`[PAYMENT] Webhook order=${verified.orderId} status=${verified.transactionStatus} (belum paid)`);
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error('[PAYMENT] webhook error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

module.exports = { createTransaction, handleWebhook };
