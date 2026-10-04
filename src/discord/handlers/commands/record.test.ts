// /record command: subscriber gate, start, stop and members joining (requires TEST_DATABASE_URL)

import { skip } from "../../../db/database-fixture.ts";

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { PassThrough } from "node:stream";

import { Collection } from "discord.js";

import type { State } from "../../types.ts";

const guildId = `test-${Date.now()}-record`;
const BASE_URL = "http://localhost:3000";

process.env.RECORDINGS_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "voicejp-record-"));
process.env.BASE_URL = BASE_URL;
const { default: prisma } = await import("../../../db/prisma.ts");
const { handleRecordStartCommand, handleRecordStopCommand, handleVoiceStateUpdateRecording } = await import("./record.ts");

after(async () => {
    await fs.rm(process.env.RECORDINGS_DIR ?? "", { "recursive": true, "force": true });
    if (skip) return;

    await prisma.recording.deleteMany({ "where": { guildId } });
    await prisma.guildBilling.deleteMany({ "where": { "guildId": { "startsWith": "test-" } } });
    await prisma.$disconnect();
});

const client = { "application": { "commands": { "cache": { "find": () => ({ "id": "1" }) } } } } as never;
const alice = { "id": "alice", "displayName": "アリス", "user": { "bot": false }, "guild": { "id": guildId } };

function createState(withConnection = true): State {
    const state: State = { "connections": new Map(), "synthesisChannels": new Map(), "recognitionChannels": new Map(), "recordings": new Map() };
    if (withConnection) {
        state.connections.set(guildId, {
            guildId,
            "channelId": "voice",
            "connection": { "receiver": { "subscribe": () => new PassThrough({ "objectMode": true }) } } as never
        });
    }
    return state;
}

function createInteraction(members: Collection<string, unknown> = new Collection()) {
    const calls = { "reply": [] as Record<string, unknown>[], "editReply": [] as Record<string, unknown>[], "send": [] as string[] };
    const interaction = {
        guildId,
        "channelId": "text",
        "user": { "id": "user" },
        "guild": { "channels": { "cache": { "get": () => ({ "isVoiceBased": () => true, members }) } } },
        "channel": { "send": async (text: string) => calls.send.push(text) },
        "reply": async (options: Record<string, unknown>) => calls.reply.push(options),
        "deferReply": async () => {},
        "editReply": async (options: Record<string, unknown>) => calls.editReply.push(options)
    } as never;

    return { interaction, calls };
}

test("通話に参加していないときは、先に /join を案内する", { skip }, async () => {
    const { interaction, calls } = createInteraction();

    await handleRecordStartCommand(client, interaction, createState(false));

    assert.match(String(calls.reply[0].content), /\/join/);
});

test("月額プランに加入していないサーバーでは録音できない", { skip }, async () => {
    const state = createState();
    const { interaction, calls } = createInteraction();

    await handleRecordStartCommand(client, interaction, state);

    assert.match(String(calls.reply[0].content), new RegExp(`${BASE_URL}/dashboard/\\?guild=${guildId}`));
    assert.equal(state.recordings.size, 0);
    assert.equal(await prisma.recording.count({ "where": { guildId } }), 0);
});

test("録音を開始して、終了すると保存される。二重に開始はできない", { skip }, async () => {
    await prisma.guildBilling.create({ "data": { guildId, "subscriptionStatus": "active" } });
    const state = createState();
    const start = createInteraction();

    await handleRecordStartCommand(client, start.interaction, state);
    assert.equal(state.recordings.size, 1);
    assert.match(JSON.stringify(start.calls.editReply[0]), /録音を開始しました/);
    assert.equal((await prisma.recording.findFirstOrThrow({ "where": { guildId } })).status, "RECORDING");

    const again = createInteraction();
    await handleRecordStartCommand(client, again.interaction, state);
    assert.match(String(again.calls.reply[0].content), /すでに録音中/);

    const stop = createInteraction();
    await handleRecordStopCommand(stop.interaction, state);
    assert.equal(state.recordings.size, 0);
    assert.match(JSON.stringify(stop.calls.editReply[0]), new RegExp(`dashboard/\\?guild=${guildId}&tab=recordings`));
    assert.equal((await prisma.recording.findFirstOrThrow({ "where": { guildId } })).status, "READY");
});

test("録音していないときに終了しようとすると案内される", { skip }, async () => {
    const { interaction, calls } = createInteraction();

    await handleRecordStopCommand(interaction, createState());

    assert.match(String(calls.reply[0].content), /録音していません/);
});

test("録音中に通話へ入った人は録音に加わり、出たら外れる", { skip }, async () => {
    const state = createState();
    const start = createInteraction();
    await handleRecordStartCommand(client, start.interaction, state);
    const recording = state.recordings.get(guildId);
    assert.equal(recording?.memberCount, 0);

    await handleVoiceStateUpdateRecording({ "channelId": null } as never, { "guild": { "id": guildId }, "member": alice, "id": "alice", "channelId": "voice" } as never, state);
    assert.equal(recording?.memberCount, 1);

    await handleVoiceStateUpdateRecording({ "channelId": "voice" } as never, { "guild": { "id": guildId }, "member": alice, "id": "alice", "channelId": null } as never, state);
    assert.equal(recording?.memberCount, 0);

    await recording?.stop();
});
