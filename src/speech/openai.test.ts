// OpenAI wrappers against a local fake API

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import { after, test } from "node:test";

import pcmToWav from "./wav.ts";

import type { AddressInfo } from "node:net";

const FAKE_WAV = pcmToWav(Buffer.alloc(9600));

const requests: { url?: string; body: string }[] = [];
const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
        requests.push({ "url": req.url, "body": Buffer.concat(chunks).toString("latin1") });

        if (req.url === "/v1/audio/transcriptions") {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ "text": " こんにちは " }));
        } else {
            res.setHeader("content-type", "audio/wav");
            res.end(FAKE_WAV);
        }
    });
});
await new Promise<void>(resolve => server.listen(0, resolve));

process.env.OPENAI_API_KEY = "sk-test";
process.env.OPENAI_BASE_URL = `http://localhost:${(server.address() as AddressInfo).port}/v1`;
const { transcribe, synthesizeSpeechWithOpenAI } = await import("./openai.ts");

after(() => server.close());

test("音声を WAV にして送り、文字起こし結果を返す", async () => {
    assert.equal(await transcribe(Buffer.alloc(9600)), "こんにちは");

    const request = requests.find(item => item.url === "/v1/audio/transcriptions");
    assert.ok(request?.body.includes("RIFF"));
    assert.ok(request?.body.includes("gpt-4o-mini-transcribe"));
    assert.ok(request?.body.includes("ja"));
});

test("読み上げた音声をファイルに保存してパスを返す", async () => {
    const wavPath = await synthesizeSpeechWithOpenAI("こんにちは");

    assert.deepEqual(await fs.readFile(wavPath), FAKE_WAV);
    const request = requests.find(item => item.url === "/v1/audio/speech");
    const body = JSON.parse(Buffer.from(request?.body ?? "", "latin1").toString("utf8"));
    assert.equal(body.input, "こんにちは");
    assert.equal(body.model, "tts-1");
    assert.equal(body.response_format, "wav");
});
