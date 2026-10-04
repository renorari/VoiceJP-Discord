// Paid engine gating and usage charging (requires TEST_DATABASE_URL)

import { skip } from "#testing/database.ts";

import assert from "node:assert/strict";
import { after, test } from "node:test";

import { getBalance, grantCredits, speechCost, transcriptionCost } from "./credits.ts";

const guildId = `test-${Date.now()}-usage`;
const INITIAL_CREDITS = 100;

process.env.OPENAI_API_KEY = "sk-test";
const { default: prisma } = await import("#lib/prisma.ts");
const { chargeSpeech, chargeTranscription, hasCredits, shouldUsePlus } = await import("./usage.ts");
const { updateEngineSettings } = await import("./settings.ts");

after(async () => {
    if (skip) return;

    await prisma.guildBilling.deleteMany({ "where": { "guildId": { "startsWith": "test-" } } });
    await prisma.$disconnect();
});

test("クレジットがないサーバーは有料のエンジンを使わない", { skip }, async () => {
    assert.equal(await hasCredits(guildId), false);
});

test("クレジットがあると有料のエンジンを使う", { skip }, async () => {
    await grantCredits({ guildId, "amount": INITIAL_CREDITS, "type": "TOPUP" });

    assert.equal(await hasCredits(guildId), true);
});

test("読み上げと文字起こしの使用量だけクレジットが減る", { skip }, async () => {
    await chargeSpeech(guildId, 100);
    assert.equal(await getBalance(guildId), INITIAL_CREDITS - speechCost(100));

    assert.equal(await chargeTranscription(guildId, 30, "member"), false);
    assert.equal(await getBalance(guildId), INITIAL_CREDITS - speechCost(100) - transcriptionCost(30));
});

test("使い切ったら文字起こしが true (切り替え合図) を返す", { skip }, async () => {
    assert.equal(await chargeTranscription(guildId, 600, "member"), true);
    assert.equal(await hasCredits(guildId), false);
});

test("VoiceJP+ を選んでいて、クレジットがあるときだけ有料のエンジンを使う", { skip }, async () => {
    const id = `${guildId}-engine`;

    // クレジットがなければ、VoiceJP+ を選んでいても使わない
    assert.equal(await shouldUsePlus(id, "synthesis"), false);

    await grantCredits({ "guildId": id, "amount": 100, "type": "TOPUP" });
    assert.equal(await shouldUsePlus(id, "synthesis"), true);
    assert.equal(await shouldUsePlus(id, "recognition"), true);

    // 標準を選ぶと、クレジットがあっても使わない (読み上げと文字起こしは別々)
    await updateEngineSettings(id, { "synthesisEngine": "FREE" });
    assert.equal(await shouldUsePlus(id, "synthesis"), false);
    assert.equal(await shouldUsePlus(id, "recognition"), true);
});
