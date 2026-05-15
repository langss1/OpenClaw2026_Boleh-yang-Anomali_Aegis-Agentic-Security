'use strict';

const midtransClient = require('midtrans-client');
const { cfg, isMidtransConfigured } = require('../config');

let _snap = null;
let _coreApi = null;

function ensureClient() {
    if (!isMidtransConfigured()) {
        throw new Error(
            '[MIDTRANS] Server/Client key belum diset. ' +
            'Set env MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY. ' +
            'Untuk demo cepat: register sandbox di https://dashboard.sandbox.midtrans.com'
        );
    }
    if (!_snap) {
        _snap = new midtransClient.Snap({
            isProduction: cfg.midtrans.isProduction,
            serverKey: cfg.midtrans.serverKey,
            clientKey: cfg.midtrans.clientKey,
        });
        _coreApi = new midtransClient.CoreApi({
            isProduction: cfg.midtrans.isProduction,
            serverKey: cfg.midtrans.serverKey,
            clientKey: cfg.midtrans.clientKey,
        });
    }
    return { snap: _snap, coreApi: _coreApi };
}

async function createSnapTransaction({ orderId, plan, userId, customerEmail }) {
    const { snap } = ensureClient();

    const parameter = {
        transaction_details: {
            order_id: orderId,
            gross_amount: plan.priceIdr,
        },
        item_details: [{
            id: plan.id,
            price: plan.priceIdr,
            quantity: 1,
            name: plan.name,
            category: 'subscription',
        }],
        customer_details: {
            first_name: userId,
            email: customerEmail || `${userId}@aegis.demo`,
        },
        credit_card: { secure: true },
        callbacks: {
            finish: process.env.MIDTRANS_FINISH_URL || 'http://localhost:3000/success',
        },
    };

    const response = await snap.createTransaction(parameter);
    return {
        snapToken: response.token,
        redirectUrl: response.redirect_url,
        orderId,
    };
}

async function verifyNotification(payload) {
    const { coreApi } = ensureClient();
    const statusResponse = await coreApi.transaction.notification(payload);
    return {
        orderId: statusResponse.order_id,
        transactionStatus: statusResponse.transaction_status,
        fraudStatus: statusResponse.fraud_status,
        paymentType: statusResponse.payment_type,
        grossAmount: statusResponse.gross_amount,
        rawStatus: statusResponse,
    };
}

async function getTransactionStatus(orderId) {
    const { coreApi } = ensureClient();
    const statusResponse = await coreApi.transaction.status(orderId);
    return {
        orderId: statusResponse.order_id,
        transactionStatus: statusResponse.transaction_status,
        fraudStatus: statusResponse.fraud_status,
        paymentType: statusResponse.payment_type,
        grossAmount: statusResponse.gross_amount,
        rawStatus: statusResponse,
    };
}

function isPaid({ transactionStatus, fraudStatus }) {
    if (transactionStatus === 'capture' && fraudStatus === 'accept') return true;
    if (transactionStatus === 'settlement') return true;
    return false;
}

module.exports = {
    createSnapTransaction,
    verifyNotification,
    getTransactionStatus,
    isPaid,
};
