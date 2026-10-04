// Read-aloud audio files are deleted after playback

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { AudioPlayerStatus } from "@discordjs/voice";

import handleMessageCreateEvent from "./message.ts";

import type { State } from "../types.ts";

const guildId = "123456789012345678";
const SPEECH_DIR = path.join(os.tmpdir(), "voicejp", "speech");

async function wavFiles() {
    return new Set((await fs.readdir(SPEECH_DIR)).filter(name => name.endsWith(".wav")));
}

test("読み上げた音声のファイルは、読み上げが終わったら削除される", async () => {
    const callbacks = new Map<unknown, () => void>();
    const player = {
        "stop": () => {},
        // 本物の再生は ffmpeg を起動するので、受け取ったリソースはすぐに閉じる
        "play": (resource: { playStream: { destroy: () => void } }) => resource.playStream.destroy(),
        "once": (event: unknown, callback: () => void) => callbacks.set(event, callback)
    };
    const state = { "synthesisChannels": new Map([[guildId, { guildId, "textChannelId": "text", "voiceChannelId": "voice", "connection": {}, player }]]) } as unknown as State;
    const message = { "author": { "bot": false, "username": "user" }, "member": { "displayName": "アリス" }, guildId, "channelId": "text", "content": "こんにちは" } as never;

    const before = await wavFiles();
    await handleMessageCreateEvent(message, state);
    const created = Array.from(await wavFiles()).filter(name => !before.has(name));
    assert.equal(created.length, 1, "音声ファイルが 1 つ作られている");

    // 読み上げが終わった (止められた) ときの処理を呼ぶ
    callbacks.get(AudioPlayerStatus.Idle)?.();
    await new Promise(resolve => setTimeout(resolve, 200));

    assert.ok(!(await wavFiles()).has(created[0]), "音声ファイルが削除されている");
});
