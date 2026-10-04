// Record command (a subscriber benefit)

import isSubscribed from "#billing/subscription.ts";
import log from "#utils/logger.ts";
import { EmbedBuilder } from "discord.js";

import ActiveRecording from "../../../recordings/recorder.ts";
import { RETENTION_DAYS } from "../../../recordings/constants.ts";
import { EMBED_COLOR } from "../../constants/index.ts";
import { replyEphemeral, replyNoVoiceChannel } from "../../utils/reply.ts";
import { stopRecording } from "../../utils/session.ts";

import type { ChatInputCommandInteraction, Client, VoiceState } from "discord.js";
import type { State } from "../../types.ts";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const LIMIT_MESSAGE = "最大の録音時間に達したため、録音を終了して保存しました。";

const logger = log.getLogger("recording");

function dashboardUrl(guildId: string) {
    return `${BASE_URL}/dashboard/?guild=${guildId}&tab=recordings`;
}

function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}分${seconds % 60}秒` : `${seconds}秒`;
}

export async function handleRecordStartCommand(client: Client, interaction: ChatInputCommandInteraction<"cached">, state: State) {
    const { guildId } = interaction;

    if (state.recordings.has(guildId)) {
        await replyEphemeral(interaction, "すでに録音中です。終了するには `/record stop` を実行してください。");
        return;
    }

    const connection = state.connections.get(guildId);
    if (!connection) {
        await replyNoVoiceChannel(client, interaction);
        return;
    }

    if (!await isSubscribed(guildId)) {
        await replyEphemeral(interaction, `録音は、月額プランに加入しているサーバーで使えます。\n${BASE_URL}/dashboard/?guild=${guildId}`);
        return;
    }

    await interaction.deferReply();

    const recording = await ActiveRecording.start(guildId, interaction.channelId, interaction.user.id, () => {
        stopRecording(guildId, state);
        interaction.channel?.send(LIMIT_MESSAGE).catch(error => logger.error(error));
    });
    state.recordings.set(guildId, recording);

    const voiceChannel = interaction.guild.channels.cache.get(connection.channelId);
    if (voiceChannel?.isVoiceBased()) {
        await Promise.all(voiceChannel.members
            .filter(member => !member.user.bot)
            .map(member => recording.addMember(member, connection.connection).catch(error => logger.error(error))));
    }

    await interaction.editReply({
        "embeds": [
            new EmbedBuilder()
                .setTitle("🔴 録音を開始しました")
                .setDescription([
                    "この通話の音声を録音し、自動で文字起こしします。参加している皆さんは、録音されていることをご確認ください。",
                    "終了するには `/record stop` を実行してください。",
                    `録音は${RETENTION_DAYS}日後に自動で削除されます。`
                ].join("\n"))
                .setColor(EMBED_COLOR)
        ]
    });
}

export async function handleRecordStopCommand(interaction: ChatInputCommandInteraction<"cached">, state: State) {
    const { guildId } = interaction;
    const recording = state.recordings.get(guildId);

    if (!recording) {
        await replyEphemeral(interaction, "録音していません。");
        return;
    }

    await interaction.deferReply();
    const seconds = Math.round((Date.now() - recording.startedAt) / 1000);
    await stopRecording(guildId, state);

    await interaction.editReply({
        "embeds": [
            new EmbedBuilder()
                .setTitle("⏹ 録音を保存しました")
                .setDescription(`録音時間: ${formatDuration(seconds)}\n[ダッシュボードで聞く・文字起こしを見る](${dashboardUrl(guildId)})`)
                .setColor(EMBED_COLOR)
        ]
    });
}

// 録音中に通話へ出入りした人を、録音に加える・外す
export async function handleVoiceStateUpdateRecording(oldState: VoiceState, newState: VoiceState, state: State) {
    const recording = state.recordings.get(newState.guild.id);
    const connection = state.connections.get(newState.guild.id);
    if (!recording || !connection || !newState.member || newState.member.user.bot) return;

    if (newState.channelId === connection.channelId) {
        await recording.addMember(newState.member, connection.connection);
    } else if (oldState.channelId === connection.channelId) {
        await recording.removeMember(newState.id);
    }
}
