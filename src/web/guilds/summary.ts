// Manageable guilds with their VoiceJP+ status, paid ones first

import { ACTIVE_SUBSCRIPTION_STATUSES } from "#billing/constants.ts";
import prisma from "#lib/prisma.ts";

import type { ManageableGuild } from "./manageable.ts";

export interface GuildSummary extends ManageableGuild {
    plus: {
        subscribed: boolean;
        plan: string | null;
        credits: number;
    };
}

// 月額プランに加入中、クレジットがある、どちらもない、の順に並べる (同じなら名前順)
function rank(guild: GuildSummary) {
    return guild.plus.subscribed ? 0 : guild.plus.credits > 0 ? 1 : 2;
}

export default async function summarizeGuilds(guilds: ManageableGuild[]): Promise<GuildSummary[]> {
    const billings = await prisma.guildBilling.findMany({ "where": { "guildId": { "in": guilds.map(guild => guild.id) } } });
    const byGuild = new Map(billings.map(billing => [billing.guildId, billing]));

    return guilds
        .map(guild => {
            const billing = byGuild.get(guild.id);
            const subscribed = Boolean(billing?.subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.includes(billing.subscriptionStatus));

            return { ...guild, "plus": { subscribed, "plan": subscribed ? billing?.subscriptionPlan ?? null : null, "credits": billing?.credits ?? 0 } };
        })
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "ja"));
}
