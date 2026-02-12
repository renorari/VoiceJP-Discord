/*
    VoiceJP Discord Bot Handler: Message Create Event
*/

import { Client, Message } from "discord.js";

import { createAudioResource } from "@discordjs/voice";

import i18n from "../../i18n.ts";
import synthesizeSpeech from "../../utils/speech.ts";
import sendAdMessage from "../utils/ad.ts";

import type { GuildTextBasedChannel, OmitPartialGroupDMChannel } from "discord.js";
import type { SynthesisChannels } from "../../types/index.d.ts";

export async function handleMessageCreateEvent(client: Client, message: OmitPartialGroupDMChannel<Message>, synthesisChannels: SynthesisChannels) {
    if (message.author.bot) return;

    Array.from(synthesisChannels.values()).forEach(channel => {
        if (channel.textChannelId === message.channelId) {
            channel.player.stop();

            const username = message.member ? message.member.displayName : message.author.username;
            const shortUsername = username.length > 5 ? username.slice(0, 5) : username;
            const shortContent = message.content.length > 200 ? message.content.slice(0, 200) : message.content;

            synthesizeSpeech(i18n.__("public.speechSynthesis.readMessage", shortUsername, shortContent)).then(path => {
                const resource = createAudioResource(path);
                channel.player.play(resource);
            });

            if (Math.random() < 0.01) sendAdMessage(message.channel as GuildTextBasedChannel).catch(() => {});
        }
    });
}
