// Message create event

import log from "#utils/logger.ts";
import synthesizeSpeech from "#utils/speech.ts";

import { createAudioResource } from "@discordjs/voice";

import type { Message, OmitPartialGroupDMChannel } from "discord.js";
import type { State } from "../types.ts";

const USERNAME_LIMIT = 5;
const CONTENT_LIMIT = 200;

const logger = log.getLogger("discord");

export default async function handleMessageCreateEvent(message: OmitPartialGroupDMChannel<Message>, state: State) {
    if (message.author.bot || !message.guildId) return;

    const channel = state.synthesisChannels.get(message.guildId);
    if (channel?.textChannelId !== message.channelId) return;

    channel.player.stop();

    const username = message.member ? message.member.displayName : message.author.username;
    const text = `${username.slice(0, USERNAME_LIMIT)}、${message.content.slice(0, CONTENT_LIMIT)}`;

    try {
        channel.player.play(createAudioResource(await synthesizeSpeech(text)));
    } catch (error) {
        logger.error(error);
    }
}
