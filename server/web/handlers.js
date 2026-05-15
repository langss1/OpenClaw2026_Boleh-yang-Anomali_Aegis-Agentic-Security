'use strict';

const { cfg } = require('../config');
const midtrans = require('../payment/midtrans');
const store = require('../subscription/store');
const pages = require('./pages');

function landing(_req, res) {
    res.type('html').send(pages.landing());
}

function pricing(_req, res) {
    res.type('html').send(pages.pricing(cfg.plans, cfg.currency));
}

async function success(req, res) {
    const orderId = req.query.order_id || null;

    if (!orderId) {
        return res.type('html').send(pages.successPage({ orderId: null }));
    }

    try {
        const status = await midtrans.getTransactionStatus(orderId);
        const paid = midtrans.isPaid(status);

        let subscription = null;
        let alreadyActive = false;

        if (paid) {
            const order = store.getOrder(orderId);
            if (order) {
                if (order.status === 'paid') {
                    alreadyActive = true;
                    subscription = store.getSubscription(order.userId);
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
        }

        return res.type('html').send(pages.successPage({
            orderId, subscription, status, paid, alreadyActive,
        }));
    } catch (err) {
        console.error('[WEB] /success error:', err.message);
        return res.type('html').send(pages.successPage({
            orderId, errorMsg: err.message,
        }));
    }
}

module.exports = { landing, pricing, success };
