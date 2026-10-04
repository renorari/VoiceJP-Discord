// Recordings API with a stubbed login (requires TEST_DATABASE_URL)

import { skip } from "#testing/database.ts";

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, mock, test } from "node:test";

import express from "express";

const guildId = "123456789012345678";
const otherGuildId = "223456789012345678";
const MANAGE_GUILD = "32";

process.env.RECORDINGS_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "voicejp-api-"));
const { default: prisma } = await import("#lib/prisma.ts");
const { default: auth } = await import("../auth.ts");
const { default: recordingsRouter } = await import("./recordings.ts");
const { errorHandler, notFoundHandler } = await import("../middlewares/error.ts");
const { fetchManageableGuilds } = await import("../guilds/manageable.ts");
const { default: log } = await import("#lib/logger.ts");

let loggedIn = true;
const originalFetch = globalThis.fetch;

mock.method(auth.api, "getSession", async () => loggedIn ? { "user": { "id": "user" } } : null);
mock.method(auth.api, "listUserAccounts", async () => [{ "id": "account", "providerId": "discord" }]);
mock.method(auth.api, "getAccessToken", async () => ({ "accessToken": "token" }));

// ログインしたユーザーの管理できるサーバー一覧を、Discord を呼ばずに先にキャッシュしておく
mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes("discord.com")) {
        return new Response(JSON.stringify([{ "id": guildId, "name": "g", "icon": null, "permissions": MANAGE_GUILD }]));
    }
    return originalFetch(input, init);
});
await fetchManageableGuilds("user", {});

const app = express();
app.use("/api", recordingsRouter);
app.use(notFoundHandler);
app.use(errorHandler(log.getLogger("test")));
const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const listening = app.listen(0, () => resolve(listening));
});
const base = `http://localhost:${(server.address() as AddressInfo).port}/api/guilds/${guildId}/recordings`;

const AUDIO = Buffer.from("0123456789abcdefghij");
const transcript = [{ "at": 1500, "memberId": "a", "name": "アリス", "text": "こんにちは" }, { "at": 65_000, "memberId": "b", "name": "ボブ", "text": "はい" }];
const recordingIds: string[] = [];

after(async () => {
    server.close();
    mock.restoreAll();
    await fs.rm(process.env.RECORDINGS_DIR ?? "", { "recursive": true, "force": true });
    if (skip) return;

    await prisma.recording.deleteMany({ "where": { "guildId": { "in": [guildId, otherGuildId] } } });
    await prisma.$disconnect();
});

async function createRecording(targetGuildId: string, status: "READY" | "RECORDING") {
    const recording = await prisma.recording.create({
        "data": {
            "guildId": targetGuildId, "channelId": "c", "startedBy": "u", status,
            "startedAt": new Date("2026-10-05T01:30:00Z"), "durationSeconds": 90, "audioFile": status === "READY" ? "mixed.m4a" : null,
            "transcript": transcript, "expiresAt": new Date(Date.now() + 86_400_000)
        }
    });
    await fs.mkdir(path.join(process.env.RECORDINGS_DIR ?? "", recording.id), { "recursive": true });
    await fs.writeFile(path.join(process.env.RECORDINGS_DIR ?? "", recording.id, "mixed.m4a"), AUDIO);
    recordingIds.push(recording.id);

    return recording.id;
}

test("ログインしていないと 401", { skip }, async () => {
    loggedIn = false;
    const response = await fetch(base);
    loggedIn = true;

    assert.equal(response.status, 401);
});

test("一覧・詳細・文字起こしのダウンロード", { skip }, async () => {
    const id = await createRecording(guildId, "READY");

    const list = await (await fetch(base)).json() as { recordings: { id: string; hasAudio: boolean; transcriptCount: number }[] };
    assert.deepEqual(list.recordings.map(item => [item.id, item.hasAudio, item.transcriptCount]), [[id, true, 2]]);

    const detail = await (await fetch(`${base}/${id}`)).json() as { transcript: unknown };
    assert.deepEqual(detail.transcript, transcript);

    const text = await fetch(`${base}/${id}/transcript.txt`);
    assert.match(text.headers.get("content-disposition") ?? "", /attachment; filename="voicejp-2026-10-05-01-30\.txt"/);
    assert.equal(await text.text(), "[00:00:01] アリス: こんにちは\n[00:01:05] ボブ: はい");
});

test("音声は途中から (Range) も取得でき、ダウンロード用の名前も付けられる", { skip }, async () => {
    const id = recordingIds[0];

    const full = await fetch(`${base}/${id}/audio`);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get("content-type"), "audio/mp4");
    assert.deepEqual(Buffer.from(await full.arrayBuffer()), AUDIO);

    const partial = await fetch(`${base}/${id}/audio`, { "headers": { "range": "bytes=5-9" } });
    assert.equal(partial.status, 206);
    assert.equal(await partial.text(), "56789");

    const download = await fetch(`${base}/${id}/audio?download=1`);
    assert.match(download.headers.get("content-disposition") ?? "", /attachment; filename="voicejp-2026-10-05-01-30\.m4a"/);
});

test("別のサーバーの録音は ID を知っていても見られない", { skip }, async () => {
    const otherId = await createRecording(otherGuildId, "READY");

    for (const suffix of ["", "/audio", "/transcript.txt"]) {
        assert.equal((await fetch(`${base}/${otherId}${suffix}`)).status, 404, suffix);
    }
    assert.equal((await fetch(`${base}/${otherId}`, { "method": "DELETE" })).status, 404);
    assert.equal((await fetch(`${base}/..%2F..`)).status, 404);
});

test("録音中のものは削除できず、保存済みのものはファイルごと削除できる", { skip }, async () => {
    const recordingId = await createRecording(guildId, "RECORDING");
    assert.equal((await fetch(`${base}/${recordingId}`, { "method": "DELETE" })).status, 409);

    const readyId = recordingIds[0];
    assert.equal((await fetch(`${base}/${readyId}`, { "method": "DELETE" })).status, 200);
    assert.equal(await prisma.recording.findUnique({ "where": { "id": readyId } }), null);
    await assert.rejects(fs.access(path.join(process.env.RECORDINGS_DIR ?? "", readyId)));
});
