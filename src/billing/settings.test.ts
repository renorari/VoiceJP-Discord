// Engine settings (requires TEST_DATABASE_URL)

import { skip } from "#testing/database.ts";

import assert from "node:assert/strict";
import { after, test } from "node:test";

const guildId = `test-${Date.now()}-settings`;

const { default: prisma } = await import("#lib/prisma.ts");
const { getEngineSettings, isEngine, updateEngineSettings } = await import("./settings.ts");

after(async () => {
    if (skip) return;

    await prisma.guildSettings.deleteMany({ "where": { "guildId": { "startsWith": "test-" } } });
    await prisma.$disconnect();
});

test("エンジン名の判定", () => {
    assert.equal(isEngine("FREE"), true);
    assert.equal(isEngine("PLUS"), true);
    assert.equal(isEngine("free"), false);
    assert.equal(isEngine(undefined), false);
});

test("何も設定していないサーバーは VoiceJP+ (クレジットがあれば使う) が初期値", { skip }, async () => {
    assert.deepEqual(await getEngineSettings(guildId), { "synthesisEngine": "PLUS", "recognitionEngine": "PLUS" });
});

test("読み上げと文字起こしを別々に変えられ、すぐに反映される", { skip }, async () => {
    await getEngineSettings(guildId);

    assert.deepEqual(await updateEngineSettings(guildId, { "synthesisEngine": "FREE" }), { "synthesisEngine": "FREE", "recognitionEngine": "PLUS" });
    assert.deepEqual(await getEngineSettings(guildId), { "synthesisEngine": "FREE", "recognitionEngine": "PLUS" });

    await updateEngineSettings(guildId, { "recognitionEngine": "FREE" });
    assert.deepEqual(await getEngineSettings(guildId), { "synthesisEngine": "FREE", "recognitionEngine": "FREE" });
});
