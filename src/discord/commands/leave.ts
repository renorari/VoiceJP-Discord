// Leave command

import { replyEphemeral } from "../utils/reply.ts";
import closeSession from "../utils/session.ts";

import type { ChatInputCommandInteraction } from "discord.js";
import type { State } from "../types.ts";

export default async function handleLeaveCommand(interaction: ChatInputCommandInteraction<"cached">, state: State) {
    if (!state.connections.has(interaction.guildId)) {
        await replyEphemeral(interaction, "Botは現在どのボイスチャンネルにも参加していません。");
        return;
    }

    closeSession(interaction.guildId, state);
    await replyEphemeral(interaction, "ボイスチャンネルから退出しました。");
}
