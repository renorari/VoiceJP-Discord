// Engine settings API with a stubbed login (requires TEST_DATABASE_URL)

import { skip } from "#testing/database.ts";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, mock, test } from "node:test";

import express from "express";

const guildId = "123456789012345678";
const MANAGE_GUILD = "32";

const { default: prisma } = await import("#lib/prisma.ts");
const { default: auth } = await import("../auth.ts");
const { default: settingsRouter } = await import("./settings.ts");
const { errorHandler, notFoundHandler } = await import("../middlewares/error.ts");
const { fetchManageableGuilds } = await import("../guilds/manageable.ts");
const { default: log } = await import("#lib/logger.ts");

const originalFetch = globalThis.fetch;
mock.method(auth.api, "getSession", async () => ({ "user": { "id": "user" } }));
mock.method(auth.api, "listUserAccounts", async () => [{ "id": "account", "providerId": "discord" }]);
mock.method(auth.api, "getAccessToken", async () => ({ "accessToken": "token" }));
mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes("discord.com")) {
        return new Response(JSON.stringify([{ "id": guildId, "name": "g", "icon": null, "permissions": MANAGE_GUILD }]));
    }
    return originalFetch(input, init);
});
await fetchManageableGuilds("user", {});

const app = express();
app.use(express.json());
app.use("/api", settingsRouter);
app.use(notFoundHandler);
app.use(errorHandler(log.getLogger("test")));
const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const listening = app.listen(0, () => resolve(listening));
});
const url = `http://localhost:${(server.address() as AddressInfo).port}/api/guilds/${guildId}/settings`;

after(async () => {
    server.close();
    mock.restoreAll();
    if (skip) return;

    await prisma.guildSettings.deleteMany({ "where": { guildId } });
    await prisma.$disconnect();
});

function put(body: unknown) {
    return fetch(url, { "method": "PUT", "headers": { "Content-Type": "application/json" }, "body": JSON.stringify(body) });
}

test("初期値は両方とも VoiceJP+ で、片方だけ変えられる", { skip }, async () => {
    assert.deepEqual(await (await fetch(url)).json(), { "status": "ok", "synthesisEngine": "PLUS", "recognitionEngine": "PLUS" });

    const response = await put({ "synthesisEngine": "FREE" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { "status": "ok", "synthesisEngine": "FREE", "recognitionEngine": "PLUS" });
    assert.deepEqual(await (await fetch(url)).json(), { "status": "ok", "synthesisEngine": "FREE", "recognitionEngine": "PLUS" });
});

test("不正な値や空の指定は 400 で、何も変わらない", { skip }, async () => {
    assert.equal((await put({ "synthesisEngine": "PLUS", "recognitionEngine": "gold" })).status, 400);
    assert.equal((await put({})).status, 400);
    assert.equal((await put({ "unknown": "FREE" })).status, 400);

    assert.deepEqual(await (await fetch(url)).json(), { "status": "ok", "synthesisEngine": "FREE", "recognitionEngine": "PLUS" });
});
