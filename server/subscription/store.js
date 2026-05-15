'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cfg, getPlanById } = require('../config');

function filePath() {
    return path.join(cfg.storage.dataDir, cfg.storage.subscriptionsFile);
}

function ensureFile() {
    fs.mkdirSync(cfg.storage.dataDir, { recursive: true });
    if (!fs.existsSync(filePath())) {
        fs.writeFileSync(filePath(), JSON.stringify({ users: {}, orders: {} }, null, 2));
    }
}

function readAll() {
    ensureFile();
    return JSON.parse(fs.readFileSync(filePath(), 'utf8'));
}

function writeAll(data) {
    ensureFile();
    fs.writeFileSync(filePath(), JSON.stringify(data, null, 2));
}

function generateLicenseKey() {
    return 'AEGIS-' + crypto.randomBytes(12).toString('hex').toUpperCase();
}

function generateOrderId(planId) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `AEG-${planId.toUpperCase()}-${ts}-${rand}`;
}

function getSubscription(userId) {
    const data = readAll();
    const sub = data.users[userId];
    if (!sub) {
        const freePlan = getPlanById('free');
        return {
            userId,
            tier: 'free',
            planName: freePlan ? freePlan.name : 'Aegis Free',
            licenseKey: null,
            limits: freePlan ? freePlan.limits : { aiBackend: 'mock' },
            expiresAt: null,
            isActive: true,
        };
    }
    return sub;
}

function createPendingOrder({ userId, planId, orderId }) {
    const data = readAll();
    data.orders[orderId] = {
        orderId,
        userId,
        planId,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
    writeAll(data);
    return data.orders[orderId];
}

function getOrder(orderId) {
    return readAll().orders[orderId] || null;
}

function activateSubscription({ orderId, paymentMeta = {} }) {
    const data = readAll();
    const order = data.orders[orderId];
    if (!order) throw new Error(`Order ${orderId} tidak ditemukan.`);

    const plan = getPlanById(order.planId);
    if (!plan) throw new Error(`Plan ${order.planId} tidak ditemukan di plans.json.`);

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const licenseKey = generateLicenseKey();

    data.users[order.userId] = {
        userId: order.userId,
        tier: plan.id,
        planName: plan.name,
        licenseKey,
        limits: plan.limits,
        expiresAt: expiresAt.toISOString(),
        isActive: true,
        activatedAt: now.toISOString(),
        lastOrderId: orderId,
    };

    order.status = 'paid';
    order.paidAt = now.toISOString();
    order.paymentMeta = paymentMeta;

    writeAll(data);
    return data.users[order.userId];
}

function deactivate(userId) {
    const data = readAll();
    if (!data.users[userId]) return null;
    data.users[userId].isActive = false;
    writeAll(data);
    return data.users[userId];
}

module.exports = {
    generateOrderId,
    getSubscription,
    createPendingOrder,
    getOrder,
    activateSubscription,
    deactivate,
};
