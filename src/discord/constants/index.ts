/*
    VoiceJP Discord Bot Constants
*/

import { ClientOptions, GatewayIntentBits, SlashCommandBuilder } from "discord.js";

export const clientOptions: ClientOptions = {
    "intents": [
        GatewayIntentBits.Guilds
    ]
};

export const commands = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Botの現在情報を表示します。"),
    new SlashCommandBuilder()
        .setName("help")
        .setDescription("利用可能なコマンドの一覧を表示します。")
];
