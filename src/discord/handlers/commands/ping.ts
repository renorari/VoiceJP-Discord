/*
    VoiceJP Discord Bot Handler: Ping Command
*/

import { Client, Colors, CommandInteraction, EmbedBuilder } from "discord.js";

import i18n from "../../../i18n.ts";

import type { Connections, RecognitionChannels, SynthesisChannels } from "../../../types/index.d.ts";

export default async function handlePingCommand(client: Client, interaction: CommandInteraction, connections: Connections, synthesisChannels: SynthesisChannels, recognitionChannels: RecognitionChannels) {
    await interaction.reply({
        "content": i18n.__("public.ping.pong"),
        "embeds": [
            new EmbedBuilder()
                .setTitle(i18n.__("public.ping.statusTitle"))
                .addFields({
                    "name": i18n.__("public.ping.websocketLatency"),
                    "value": `${client.ws.ping} ms`,
                    "inline": true
                })
                .addFields({
                    "name": i18n.__("public.ping.apiLatency"),
                    "value": `${Date.now() - interaction.createdTimestamp} ms`,
                    "inline": true
                })
                .addFields({
                    "name": i18n.__("public.ping.uptime"),
                    "value": `<t:${Math.floor(new Date(Date.now() - client.uptime!).getTime() / 1000)}:R>`
                })
                .addFields({
                    "name": i18n.__("public.ping.guildCount"),
                    "value": i18n.__("public.ping.guildCountValue", client.guilds.cache.size.toLocaleString("ja-JP")),
                    "inline": true
                })
                .addFields({
                    "name": i18n.__("public.ping.voiceChannelCount"),
                    "value": i18n.__("public.ping.channelCountValue", connections.size.toLocaleString("ja-JP")),
                    "inline": true
                })
                .addFields({
                    "name": i18n.__("public.ping.synthesisChannelCount"),
                    "value": i18n.__("public.ping.channelCountValue", synthesisChannels.size.toLocaleString("ja-JP")),
                    "inline": true
                })
                .addFields({
                    "name": i18n.__("public.ping.recognitionCounts"),
                    "value": i18n.__(
                        "public.ping.recognitionCountValue",
                        recognitionChannels.size.toLocaleString("ja-JP"),
                        Array.from(recognitionChannels.values()).reduce((acc, curr) => acc + curr.members.size, 0).toLocaleString("ja-JP")
                    ),
                    "inline": true
                })
                .setColor(Colors.DarkBlue)
                .setTimestamp()
        ]
    });
}
