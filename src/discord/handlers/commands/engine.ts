// Engine command: choose the free engines or VoiceJP+ per server

import { getBalance } from "#billing/credits.ts";
import { getEngineSettings, isEngine, updateEngineSettings } from "#billing/settings.ts";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";

import { EMBED_COLOR, ENGINE_LABELS } from "../../constants/index.ts";
import { replyEphemeral } from "../../utils/reply.ts";

import type { ChatInputCommandInteraction } from "discord.js";
import type { EngineSettings } from "#billing/settings.ts";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export default async function handleEngineCommand(interaction: ChatInputCommandInteraction<"cached">) {
    if (!process.env.DATABASE_URL) {
        await replyEphemeral(interaction, "VoiceJP+ は、このBotでは利用できません。");
        return;
    }

    const changes: Partial<EngineSettings> = {};
    const synthesis = interaction.options.getString("synthesis");
    const recognition = interaction.options.getString("recognition");
    if (isEngine(synthesis)) changes.synthesisEngine = synthesis;
    if (isEngine(recognition)) changes.recognitionEngine = recognition;

    const changing = Object.keys(changes).length > 0;
    if (changing && !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        await replyEphemeral(interaction, "エンジンを変更するには、「サーバー管理」権限が必要です。");
        return;
    }

    const settings = changing ? await updateEngineSettings(interaction.guildId, changes) : await getEngineSettings(interaction.guildId);
    const credits = await getBalance(interaction.guildId);

    await interaction.reply({
        "flags": ["Ephemeral"],
        "embeds": [
            new EmbedBuilder()
                .setTitle(changing ? "エンジンを変更しました" : "現在のエンジン")
                .addFields(
                    { "name": "読み上げ", "value": ENGINE_LABELS[settings.synthesisEngine], "inline": true },
                    { "name": "文字起こし", "value": ENGINE_LABELS[settings.recognitionEngine], "inline": true },
                    { "name": "VoiceJP+ のクレジット", "value": `${credits.toLocaleString("ja-JP")}${credits > 0 ? "" : " (無いときは標準が使われます)"}` }
                )
                .setDescription(`VoiceJP+ を選んでいても、クレジットが無いときは標準 (無料) を使います。\n[ダッシュボードで管理する](${BASE_URL}/dashboard/?guild=${interaction.guildId})`)
                .setColor(EMBED_COLOR)
        ]
    });
}
