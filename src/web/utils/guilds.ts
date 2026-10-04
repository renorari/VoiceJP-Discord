// Discord guilds the logged-in user can manage

import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { fromNodeHeaders } from "better-auth/node";

import auth from "../auth.ts";
import { HttpError } from "../middlewares/error.ts";

import type { IncomingHttpHeaders } from "node:http";

const DISCORD_API = "https://discord.com/api/v10";

export interface ManageableGuild {
    id: string;
    name: string;
    icon: string | null;
}

interface DiscordGuild extends ManageableGuild {
    permissions: string;
}

export function canManageGuild(permissions: string) {
    return new PermissionsBitField(BigInt(permissions)).has(PermissionFlagsBits.ManageGuild);
}

export async function fetchManageableGuilds(headers: IncomingHttpHeaders): Promise<ManageableGuild[]> {
    const betterAuthHeaders = fromNodeHeaders(headers);
    const accounts = await auth.api.listUserAccounts({ "headers": betterAuthHeaders });
    const discordAccount = accounts.find(account => account.providerId === "discord");
    if (!discordAccount) throw new HttpError(401);

    const { accessToken } = await auth.api.getAccessToken({
        "body": { "accountId": discordAccount.id },
        "headers": betterAuthHeaders
    });

    const response = await fetch(`${DISCORD_API}/users/@me/guilds`, {
        "headers": { "Authorization": `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch guilds: ${response.status}`);
    }

    const guilds = await response.json() as DiscordGuild[];
    return guilds
        .filter(guild => canManageGuild(guild.permissions))
        .map(({ id, name, icon }) => ({ id, name, icon }));
}

// ログインしているユーザーが guildId のサーバーを管理できることを確認する
export async function assertCanManageGuild(headers: IncomingHttpHeaders, guildId: string) {
    const guilds = await fetchManageableGuilds(headers);
    if (!guilds.some(guild => guild.id === guildId)) {
        throw new HttpError(403);
    }
}
