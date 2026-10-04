// Credit ledger tests (requires DATABASE_URL)

import "dotenv/config";

import assert from "node:assert/strict";
import { after, test } from "node:test";

import { consumeCredits, getBalance, grantCredits, speechCost, transcriptionCost } from "./credits.ts";

const skip = !process.env.DATABASE_URL;
const guildId = `test-${Date.now()}`;

const { default: prisma } = await import("../db/prisma.ts");

after(async () => {
    if (skip) return;

    await prisma.guildBilling.deleteMany({ "where": { "guildId": { "startsWith": "test-" } } });
    await prisma.$disconnect();
});

test("使用量からクレジットを計算する", () => {
    assert.equal(transcriptionCost(60), 20);
    assert.equal(transcriptionCost(1), 1);
    assert.equal(speechCost(100), 6);
    assert.equal(speechCost(1), 1);
});

test("残高がないサーバーは 0", { skip }, async () => {
    assert.equal(await getBalance(guildId), 0);
    assert.equal(await consumeCredits({ guildId, "amount": 5, "type": "USAGE_SPEECH" }), 0);
});

test("付与すると残高が増え、同じキーでは二重に付与されない", { skip }, async () => {
    assert.equal(await grantCredits({ guildId, "amount": 100, "type": "TOPUP", "idempotencyKey": `${guildId}-a` }), true);
    assert.equal(await grantCredits({ guildId, "amount": 100, "type": "TOPUP", "idempotencyKey": `${guildId}-a` }), false);
    assert.equal(await getBalance(guildId), 100);
});

test("使用すると残高が減り、足りないときは 0 までで止まる", { skip }, async () => {
    assert.equal(await consumeCredits({ guildId, "amount": 30, "type": "USAGE_TRANSCRIPTION" }), 30);
    assert.equal(await getBalance(guildId), 70);

    assert.equal(await consumeCredits({ guildId, "amount": 500, "type": "USAGE_SPEECH" }), 70);
    assert.equal(await getBalance(guildId), 0);
});

test("同時に使っても残高がマイナスにならない", { skip }, async () => {
    const id = `${guildId}-concurrent`;
    await grantCredits({ "guildId": id, "amount": 100, "type": "TOPUP" });

    const charged = await Promise.all(Array.from({ "length": 20 }, () => consumeCredits({ "guildId": id, "amount": 10, "type": "USAGE_SPEECH" })));

    assert.equal(charged.reduce((total, value) => total + value, 0), 100);
    assert.equal(await getBalance(id), 0);
});

test("取引履歴が残高の推移と一致する", { skip }, async () => {
    const transactions = await prisma.creditTransaction.findMany({ "where": { guildId }, "orderBy": { "createdAt": "asc" } });

    assert.deepEqual(transactions.map(transaction => [transaction.type, transaction.amount, transaction.balanceAfter]), [
        ["TOPUP", 100, 100],
        ["USAGE_TRANSCRIPTION", -30, 70],
        ["USAGE_SPEECH", -70, 0]
    ]);
});
