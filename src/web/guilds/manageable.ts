// Discord guilds the logged-in user can manage

import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { fromNodeHeaders } from "better-auth/node";

import auth from "../auth.ts";
import { HttpError } from "../middlewares/error.ts";

import type { IncomingHttpHeaders } from "node:http";

const DISCORD_API = "https://discord.com/api/v10";
const CACHE_TTL = 5 * 60 * 1000;

export interface ManageableGuild {
    id: string;
    name: string;
    icon: string | null;
}

interface DiscordGuild extends ManageableGuild {
    permissions: string;
}

interface CacheEntry {
    guilds: ManageableGuild[];
    expiresAt: number;
}

// Discord のサーバー一覧 API はレート制限が厳しいので、ユーザーごとにキャッシュする
const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<ManageableGuild[]>>();

export function canManageGuild(permissions: string) {
    return new PermissionsBitField(BigInt(permissions)).has(PermissionFlagsBits.ManageGuild);
}

async function fetchFromDiscord(headers: IncomingHttpHeaders) {
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
    if (response.status === 429) throw new HttpError(429);
    if (!response.ok) {
        throw new Error(`Failed to fetch guilds: ${response.status}`);
    }

    const guilds = await response.json() as DiscordGuild[];
    return guilds
        .filter(guild => canManageGuild(guild.permissions))
        .map(({ id, name, icon }) => ({ id, name, icon }));
}

export async function fetchManageableGuilds(userId: string, headers: IncomingHttpHeaders): Promise<ManageableGuild[]> {
    const cached = cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.guilds;

    // 同時に何度呼ばれても Discord への問い合わせは 1 回にする
    let request = pending.get(userId);
    if (!request) {
        request = fetchFromDiscord(headers).finally(() => pending.delete(userId));
        pending.set(userId, request);
    }

    try {
        const guilds = await request;
        cache.set(userId, { guilds, "expiresAt": Date.now() + CACHE_TTL });
        return guilds;
    } catch (error) {
        // レート制限に当たったときは、古くても前回の一覧を使う
        if (error instanceof HttpError && error.status === 429 && cached) return cached.guilds;
        throw error;
    }
}

// ログインしているユーザーが guildId のサーバーを管理できることを確認する
export async function assertCanManageGuild(userId: string, headers: IncomingHttpHeaders, guildId: string) {
    const guilds = await fetchManageableGuilds(userId, headers);
    if (!guilds.some(guild => guild.id === guildId)) {
        throw new HttpError(403);
    }
}
