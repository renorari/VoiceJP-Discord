// Stripe checkout parameters with a fake Stripe API (requires TEST_DATABASE_URL)

import { skip } from "../db/database-fixture.ts";

import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import Stripe from "stripe";

import { SUBSCRIPTION_PLANS } from "./constants.ts";

const guildId = `test-${Date.now()}-checkout`;

const { default: prisma } = await import("../db/prisma.ts");
const { default: stripe, changeSubscriptionPlan, createSubscriptionCheckout, planIdFromProduct } = await import("./stripe.ts");

const missing = new Stripe.errors.StripeInvalidRequestError({ "type": "invalid_request_error", "code": "resource_missing", "message": "No such product" });
const createdProducts: object[] = [];
const sessions: Record<string, unknown>[] = [];
const updates: Record<string, unknown>[] = [];
let productExists = false;
let productName: string | undefined;
const updatedProducts: object[] = [];

mock.method(stripe.customers, "create", async () => ({ "id": `cus_${guildId}` }));
mock.method(stripe.products, "retrieve", async (id: string) => {
    if (!productExists) throw missing;
    return { "name": productName ?? `VoiceJP+ ${id.endsWith("pro") ? "プロ" : ""}プラン` };
});
mock.method(stripe.products, "update", async (_id: string, params: object) => {
    updatedProducts.push(params);
    return {};
});
mock.method(stripe.products, "create", async (params: object) => {
    createdProducts.push(params);
    productExists = true;
    return {};
});
mock.method(stripe.checkout.sessions, "create", async (params: Record<string, unknown>) => {
    sessions.push(params);
    return { "url": "https://checkout.example/session" };
});
mock.method(stripe.subscriptions, "retrieve", async () => ({ "items": { "data": [{ "id": "si_1" }] } }));
mock.method(stripe.subscriptions, "update", async (_id: string, params: Record<string, unknown>) => {
    updates.push(params);
    return {};
});

after(async () => {
    mock.restoreAll();
    if (skip) return;

    await prisma.guildBilling.deleteMany({ "where": { "guildId": { "startsWith": "test-" } } });
    await prisma.$disconnect();
});

test("Stripe の商品 ID からプランが分かる", () => {
    assert.equal(planIdFromProduct("voicejp-plan-lite"), "lite");
    assert.equal(planIdFromProduct({ "id": "voicejp-plan-pro" }), "pro");
    assert.equal(planIdFromProduct("voicejp-plan-unknown"), undefined);
    assert.equal(planIdFromProduct("prod_other"), undefined);
    assert.equal(planIdFromProduct(null), undefined);
});

test("プランの商品がなければ作り、プランの金額で月額のチェックアウトを作る", { skip }, async () => {
    assert.equal(await createSubscriptionCheckout(guildId, "pro"), "https://checkout.example/session");

    assert.equal(createdProducts.length, 1);
    assert.deepEqual(createdProducts[0], { "id": "voicejp-plan-pro", "name": "VoiceJP+ プロプラン", "metadata": { "plan": "pro" } });

    const [session] = sessions;
    assert.equal(session.mode, "subscription");
    assert.equal(session.customer, `cus_${guildId}`);
    assert.deepEqual(session.line_items, [{
        "price_data": { "currency": "jpy", "unit_amount": SUBSCRIPTION_PLANS.pro.yen, "recurring": { "interval": "month" }, "product": "voicejp-plan-pro" },
        "quantity": 1
    }]);
});

test("商品がすでにあれば作り直さず、名前が違うときだけ更新する", { skip }, async () => {
    await createSubscriptionCheckout(guildId, "pro");
    assert.equal(createdProducts.length, 1);
    assert.equal(updatedProducts.length, 0);

    productName = "VoiceJP プロプラン";
    await createSubscriptionCheckout(guildId, "pro");
    assert.deepEqual(updatedProducts, [{ "name": "VoiceJP+ プロプラン" }]);
    productName = undefined;
});

test("プランの変更は日割りなしで、次回の更新から新しい金額になる", { skip }, async () => {
    await changeSubscriptionPlan("sub_1", "pro");

    assert.deepEqual(updates[0], {
        "items": [{ "id": "si_1", "price_data": { "currency": "jpy", "unit_amount": SUBSCRIPTION_PLANS.pro.yen, "recurring": { "interval": "month" }, "product": "voicejp-plan-pro" } }],
        "proration_behavior": "none"
    });
});
