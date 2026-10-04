// Stripe sync tests with a fake Stripe API (requires TEST_DATABASE_URL)

import { skip } from "../db/database-fixture.ts";

import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";

import { SUBSCRIPTION_PLANS, TOPUP_PACKS } from "./constants.ts";

const prefix = `test-${Date.now()}`;
const guildId = `${prefix}-sync`;
const customer = `cus_${guildId}`;
const DAY = 24 * 60 * 60;

function invoice(id: string, billingReason: string, plan: string) {
    return { id, customer, "billing_reason": billingReason, "lines": { "data": [{ "pricing": { "price_details": { "product": `voicejp-plan-${plan}` } } }] } };
}

const { default: prisma } = await import("../db/prisma.ts");
const { default: stripe } = await import("./stripe.ts");
const { syncDueSubscriptions, syncGuildBilling } = await import("./stripe-sync.ts");

const fake = {
    "invoices": [] as object[],
    "sessions": [] as object[],
    "subscriptions": [] as object[],
    "invoiceCalls": [] as string[]
};

mock.method(stripe.invoices, "list", async (params: { customer: string }) => {
    fake.invoiceCalls.push(params.customer);
    return { "data": fake.invoices };
});
mock.method(stripe.checkout.sessions, "list", async () => ({ "data": fake.sessions }));
mock.method(stripe.subscriptions, "list", async () => ({ "data": fake.subscriptions }));

async function billing(id = guildId) {
    return prisma.guildBilling.findUniqueOrThrow({ "where": { "guildId": id } });
}

before(async () => {
    if (!skip) await prisma.guildBilling.create({ "data": { guildId, "stripeCustomerId": customer } });
});

after(async () => {
    mock.restoreAll();
    if (skip) return;

    await prisma.guildBilling.deleteMany({ "where": { "guildId": { "startsWith": "test-" } } });
    await prisma.$disconnect();
});

test("Stripe の顧客がないサーバーは何もしない", { skip }, async () => {
    await prisma.guildBilling.create({ "data": { "guildId": `${prefix}-nocustomer` } });

    await syncGuildBilling(`${prefix}-nocustomer`);

    assert.equal(fake.invoiceCalls.length, 0);
});

test("支払い済みの月額プランの請求から毎月のクレジットが付与され、何度同期しても二重にならない", { skip }, async () => {
    fake.invoices = [
        invoice("in_1", "subscription_create", "standard"),
        invoice("in_2", "subscription_cycle", "standard"),
        invoice("in_manual", "manual", "standard"),
        invoice("in_unknown", "subscription_cycle", "unknown")
    ];

    await syncGuildBilling(guildId);
    await syncGuildBilling(guildId);

    assert.equal((await billing()).credits, SUBSCRIPTION_PLANS.standard.credits * 2);
});

test("プランを変えると、変えたあとの請求からはそのプランのクレジットが付与される", { skip }, async () => {
    const before = (await billing()).credits;
    fake.invoices = [invoice("in_3", "subscription_cycle", "pro")];

    await syncGuildBilling(guildId);

    assert.equal((await billing()).credits, before + SUBSCRIPTION_PLANS.pro.credits);
});

test("支払い済みの追加購入だけパックのクレジットが付与される", { skip }, async () => {
    const before = (await billing()).credits;
    fake.sessions = [
        { "id": "cs_paid", customer, "mode": "payment", "payment_status": "paid", "metadata": { "pack": "medium" } },
        { "id": "cs_unpaid", customer, "mode": "payment", "payment_status": "unpaid", "metadata": { "pack": "small" } },
        { "id": "cs_unknown", customer, "mode": "payment", "payment_status": "paid", "metadata": { "pack": "unknown" } },
        { "id": "cs_subscription", customer, "mode": "subscription", "payment_status": "paid", "metadata": {} }
    ];

    await syncGuildBilling(guildId);
    await syncGuildBilling(guildId);

    assert.equal((await billing()).credits, before + TOPUP_PACKS.medium.credits);
});

test("コンビニ払いなど、あとから支払いが完了したら次の同期で付与される", { skip }, async () => {
    const before = (await billing()).credits;
    fake.sessions = [{ "id": "cs_konbini", customer, "mode": "payment", "payment_status": "unpaid", "metadata": { "pack": "small" } }];

    await syncGuildBilling(guildId);
    assert.equal((await billing()).credits, before);

    fake.sessions = [{ "id": "cs_konbini", customer, "mode": "payment", "payment_status": "paid", "metadata": { "pack": "small" } }];
    await syncGuildBilling(guildId);
    assert.equal((await billing()).credits, before + TOPUP_PACKS.small.credits);
});

test("サブスクリプションの状態と期限が保存される", { skip }, async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + DAY;
    fake.subscriptions = [{ "id": "sub_1", customer, "status": "active", "items": { "data": [{ "current_period_end": periodEnd, "price": { "product": "voicejp-plan-lite" } }] } }];

    await syncGuildBilling(guildId);

    const saved = await billing();
    assert.equal(saved.subscriptionStatus, "active");
    assert.equal(saved.stripeSubscriptionId, "sub_1");
    assert.equal(saved.subscriptionPlan, "lite");
    assert.equal(saved.currentPeriodEnd?.getTime(), periodEnd * 1000);
});

test("更新日を過ぎた月額プランのサーバーだけが定期同期の対象になる", { skip }, async () => {
    const dueId = `${prefix}-due`;
    const dueCustomer = `cus_${dueId}`;
    await prisma.guildBilling.create({ "data": { "guildId": dueId, "stripeCustomerId": dueCustomer, "subscriptionStatus": "active", "currentPeriodEnd": new Date(Date.now() - 1000) } });
    fake.invoices = [];
    fake.sessions = [];
    fake.subscriptions = [];
    fake.invoiceCalls = [];

    await syncDueSubscriptions();

    // 期限内の guildId (上のテストで更新日が明日になっている) や未加入のサーバーは対象外
    assert.deepEqual(fake.invoiceCalls, [dueCustomer]);
});
