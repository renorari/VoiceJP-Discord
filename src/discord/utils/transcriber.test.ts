// Transcriber: OpenAI while there are credits, then Vosk (requires TEST_DATABASE_URL)

import { skip } from "../../db/database-fixture.ts";

import assert from "node:assert/strict";
import http from "node:http";
import { after, test } from "node:test";
import { PassThrough } from "node:stream";

import { grantCredits } from "#billing/credits.ts";
import { encodeOpus, synthesizePcm } from "#utils/audio-fixture.ts";

import type { AddressInfo } from "node:net";

const guildId = `test-${Date.now()}-transcriber`;
const PHRASE = "今日はいい天気ですね";
const AI_TEXT = "AIの文字起こし";
const TIMEOUT = 20_000;

const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ "text": AI_TEXT }));
    });
});
await new Promise<void>(resolve => server.listen(0, resolve));

process.env.OPENAI_API_KEY = "sk-test";
process.env.OPENAI_BASE_URL = `http://localhost:${(server.address() as AddressInfo).port}/v1`;
const { default: prisma } = await import("../../db/prisma.ts");
const { default: createTranscriber } = await import("./transcriber.ts");

after(async () => {
    server.close();
    if (skip) return;

    await prisma.guildBilling.deleteMany({ "where": { "guildId": { "startsWith": "test-" } } });
    await prisma.$disconnect();
});

async function waitFor(condition: () => boolean) {
    const start = Date.now();
    while (!condition() && Date.now() - start < TIMEOUT) await new Promise(resolve => setTimeout(resolve, 100));
}

test("クレジットがあるうちは OpenAI、使い切ったらその場で無料のエンジンに切り替わる", { skip }, async () => {
    // 1 回の発話でちょうど使い切る量だけ付与する
    await grantCredits({ guildId, "amount": 1, "type": "TOPUP" });

    const packets = await encodeOpus(await synthesizePcm(PHRASE));
    const opusStream = new PassThrough({ "objectMode": true });
    const texts: string[] = [];
    let exhausted = 0;

    const { dispose } = await createTranscriber(opusStream, {
        guildId,
        "memberId": "member",
        "onText": text => texts.push(text),
        "onExhausted": () => exhausted++
    });

    packets.forEach(packet => opusStream.write(packet));
    await waitFor(() => exhausted > 0);
    assert.deepEqual(texts, [AI_TEXT]);
    assert.equal(exhausted, 1);

    packets.forEach(packet => opusStream.write(packet));
    await waitFor(() => texts.join("").replace(/\n/g, "").includes(PHRASE));
    assert.ok(texts.join("").replace(/\n/g, "").includes(PHRASE), `無料のエンジンの結果: ${texts.join("|")}`);
    assert.equal(exhausted, 1);

    opusStream.destroy();
    dispose();
});

test("クレジットがなければ最初から無料のエンジンを使う", { skip }, async () => {
    const packets = await encodeOpus(await synthesizePcm(PHRASE));
    const opusStream = new PassThrough({ "objectMode": true });
    const texts: string[] = [];

    const { dispose } = await createTranscriber(opusStream, { "guildId": `${guildId}-none`, "memberId": "member", "onText": text => texts.push(text) });

    packets.forEach(packet => opusStream.write(packet));
    await waitFor(() => texts.join("").replace(/\n/g, "").includes(PHRASE));

    assert.ok(texts.join("").replace(/\n/g, "").includes(PHRASE));
    assert.ok(!texts.includes(AI_TEXT));

    opusStream.destroy();
    dispose();
});
