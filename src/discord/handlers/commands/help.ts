/*
    VoiceJP Discord Bot Handler: Help Command
*/

import { ChatInputCommandInteraction, Client, Colors, EmbedBuilder } from "discord.js";

import i18n from "../../../i18n.ts";

export default async function handleHelpCommand(client: Client, interaction: ChatInputCommandInteraction) {
    await interaction.reply({
        "embeds": [
            new EmbedBuilder()
                .setTitle(i18n.__("public.help.title"))
                .setDescription(i18n.__("public.help.description"))
                .addFields(
                    {
                        "name": "/ping",
                        "value": i18n.__("public.help.ping", `</ping:${client.application?.commands.cache.find(command => command.name === "ping")?.id}>`)
                    },
                    {
                        "name": "/join",
                        "value": i18n.__("public.help.join", `</join:${client.application?.commands.cache.find(command => command.name === "join")?.id}>`)
                    },
                    {
                        "name": "/leave",
                        "value": i18n.__("public.help.leave", `</leave:${client.application?.commands.cache.find(command => command.name === "leave")?.id}>`)
                    },
                    {
                        "name": "/speech synthesis",
                        "value": i18n.__("public.help.speechSynthesis", `</speech synthesis:${client.application?.commands.cache.find(command => command.name === "speech")?.id}>`)
                    },
                    {
                        "name": "/speech recognition",
                        "value": i18n.__("public.help.speechRecognition", `</speech recognition:${client.application?.commands.cache.find(command => command.name === "speech")?.id}>`)
                    }
                )
                .setColor(Colors.DarkBlue)
        ]
    });
}
