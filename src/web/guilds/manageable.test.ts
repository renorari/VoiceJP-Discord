// Manageable guild list: filtering, caching and rate limits

import assert from "node:assert/strict";
import { after, mock, test } from "node:test";

import auth from "../auth.ts";
import { assertCanManageGuild, canManageGuild, fetchManageableGuilds } from "./manageable.ts";

const MANAGE_GUILD = "32";
const ADMINISTRATOR = "8";
const CACHE_TTL = 5 * 60 * 1000;

const discordGuilds = [
    { "id": "1", "name": "管理できる", "icon": null, "permissions": MANAGE_GUILD },
    { "id": "2", "name": "管理者", "icon": "abc", "permissions": ADMINISTRATOR },
    { "id": "3", "name": "管理できない", "icon": null, "permissions": "0" }
];

let status = 200;
let calls = 0;

mock.timers.enable({ "apis": ["Date"] });
mock.method(auth.api, "listUserAccounts", async () => [{ "id": "account", "providerId": "discord" }]);
mock.method(auth.api, "getAccessToken", async () => ({ "accessToken": "token" }));
mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response(JSON.stringify(status === 200 ? discordGuilds : {}), { status });
});

after(() => mock.restoreAll());

test("サーバー管理権限のあるサーバーだけが対象になる", () => {
    assert.equal(canManageGuild(MANAGE_GUILD), true);
    assert.equal(canManageGuild(ADMINISTRATOR), true);
    assert.equal(canManageGuild("0"), false);
});

test("同時に何度呼んでも Discord への問い合わせは 1 回で、その後もキャッシュが使われる", async () => {
    calls = 0;

    const results = await Promise.all([1, 2, 3].map(() => fetchManageableGuilds("user-a", {})));
    await fetchManageableGuilds("user-a", {});

    assert.equal(calls, 1);
    assert.deepEqual(results[0].map(guild => guild.id), ["1", "2"]);
});

test("ユーザーごとにキャッシュされ、期限が切れたら取り直す", async () => {
    calls = 0;

    await fetchManageableGuilds("user-b", {});
    await fetchManageableGuilds("user-c", {});
    assert.equal(calls, 2);

    mock.timers.tick(CACHE_TTL + 1);
    await fetchManageableGuilds("user-b", {});
    assert.equal(calls, 3);
});

test("レート制限に当たっても、前回の一覧があればそれを返す", async () => {
    await fetchManageableGuilds("user-d", {});
    mock.timers.tick(CACHE_TTL + 1);

    status = 429;
    const guilds = await fetchManageableGuilds("user-d", {});
    status = 200;

    assert.deepEqual(guilds.map(guild => guild.id), ["1", "2"]);
});

test("前回の一覧がないときにレート制限に当たったら 429 を返す", async () => {
    status = 429;
    await assert.rejects(fetchManageableGuilds("user-e", {}), { "status": 429 });
    status = 200;
});

test("管理できないサーバーは 403 になる", async () => {
    await assertCanManageGuild("user-f", {}, "1");
    await assert.rejects(assertCanManageGuild("user-f", {}, "3"), { "status": 403 });
    await assert.rejects(assertCanManageGuild("user-f", {}, "999"), { "status": 403 });
});
