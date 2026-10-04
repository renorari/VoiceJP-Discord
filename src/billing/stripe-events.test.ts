// Stripe webhook tests (requires DATABASE_URL)

import "dotenv/config";

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { SUBSCRIPTION_MONTHLY_CREDITS, TOPUP_PACKS } from "./constants.ts";

import type Stripe from "stripe";

const WEBHOOK_SECRET = "whsec_test";

const skip = !process.env.DATABASE_URL;
const guildId = `test-${Date.now()}-stripe`;
const customer = `cus_${guildId}`;

process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
const { default: prisma } = await import("../db/prisma.ts");
const { default: applyStripeEvent } = await import("./stripe-events.ts");
const { default: stripe } = await import("./stripe.ts");
const { default: handleStripeWebhook } = await import("../web/api/stripe-webhook.ts");

function event(type: string, object: object) {
    return { "id": `evt_${Math.random()}`, type, "data": { object } } as unknown as Stripe.Event;
}

async function balance() {
    return (await prisma.guildBilling.findUniqueOrThrow({ "where": { guildId } })).credits;
}

before(async () => {
    if (!skip) await prisma.guildBilling.create({ "data": { guildId, "stripeCustomerId": customer } });
});

after(async () => {
    if (skip) return;

    await prisma.guildBilling.deleteMany({ "where": { "guildId": { "startsWith": "test-" } } });
    await prisma.$disconnect();
});

test("月額プランの請求が支払われると毎月のクレジットが付与され、再送されても二重にならない", { skip }, async () => {
    const invoice = event("invoice.paid", { "id": "in_1", customer, "billing_reason": "subscription_cycle" });

    await applyStripeEvent(invoice);
    await applyStripeEvent(invoice);

    assert.equal(await balance(), SUBSCRIPTION_MONTHLY_CREDITS);
});

test("サブスクリプション以外の請求ではクレジットを付与しない", { skip }, async () => {
    await applyStripeEvent(event("invoice.paid", { "id": "in_2", customer, "billing_reason": "manual" }));

    assert.equal(await balance(), SUBSCRIPTION_MONTHLY_CREDITS);
});

test("追加購入が支払われるとパックのクレジットが付与される", { skip }, async () => {
    const session = { "id": "cs_1", customer, "mode": "payment", "payment_status": "paid", "metadata": { guildId, "pack": "medium" } };

    await applyStripeEvent(event("checkout.session.completed", session));
    await applyStripeEvent(event("checkout.session.async_payment_succeeded", session));

    assert.equal(await balance(), SUBSCRIPTION_MONTHLY_CREDITS + TOPUP_PACKS.medium.credits);
});

test("未払いの追加購入や不明なパックでは付与しない", { skip }, async () => {
    const before = await balance();

    await applyStripeEvent(event("checkout.session.completed", { "id": "cs_2", customer, "mode": "payment", "payment_status": "unpaid", "metadata": { "pack": "small" } }));
    await applyStripeEvent(event("checkout.session.completed", { "id": "cs_3", customer, "mode": "payment", "payment_status": "paid", "metadata": { "pack": "unknown" } }));

    assert.equal(await balance(), before);
});

test("サブスクリプションの状態と期限が保存される", { skip }, async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 86400;

    await applyStripeEvent(event("customer.subscription.updated", { "id": "sub_1", customer, "status": "active", "items": { "data": [{ "current_period_end": periodEnd }] } }));

    const billing = await prisma.guildBilling.findUniqueOrThrow({ "where": { guildId } });
    assert.equal(billing.subscriptionStatus, "active");
    assert.equal(billing.stripeSubscriptionId, "sub_1");
    assert.equal(billing.currentPeriodEnd?.getTime(), periodEnd * 1000);
});

test("Webhook は署名が正しいときだけ処理される", { skip }, async () => {
    const payload = JSON.stringify({ "id": "evt_x", "object": "event", "type": "invoice.paid", "data": { "object": { "id": "in_3", customer, "billing_reason": "subscription_cycle" } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, "secret": WEBHOOK_SECRET });
    const before = await balance();

    let body: unknown;
    await handleStripeWebhook({ "body": Buffer.from(payload), "headers": { "stripe-signature": signature } } as never, { "json": (value: unknown) => { body = value; } } as never);
    assert.deepEqual(body, { "received": true });
    assert.equal(await balance(), before + SUBSCRIPTION_MONTHLY_CREDITS);

    await assert.rejects(
        handleStripeWebhook({ "body": Buffer.from(payload), "headers": { "stripe-signature": "t=1,v1=bad" } } as never, {} as never),
        { "status": 400 }
    );
});
