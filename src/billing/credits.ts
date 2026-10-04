// Per-guild credit balance and ledger

import prisma from "#lib/prisma.ts";
import { Prisma } from "#generated/prisma/client.ts";
import { SPEECH_CREDITS_PER_100_CHARACTERS, TRANSCRIPTION_CREDITS_PER_MINUTE } from "./constants.ts";

import type { CreditTransactionType } from "#generated/prisma/client.ts";

interface GrantOptions {
    guildId: string;
    amount: number;
    type: CreditTransactionType;
    idempotencyKey?: string;
    detail?: Prisma.InputJsonValue;
}

interface ConsumeOptions {
    guildId: string;
    amount: number;
    type: CreditTransactionType;
    detail?: Prisma.InputJsonValue;
}

export function transcriptionCost(seconds: number) {
    return Math.ceil(seconds * TRANSCRIPTION_CREDITS_PER_MINUTE / 60);
}

export function speechCost(characters: number) {
    return Math.ceil(characters * SPEECH_CREDITS_PER_100_CHARACTERS / 100);
}

export async function getBalance(guildId: string) {
    const billing = await prisma.guildBilling.findUnique({ "where": { guildId } });
    return billing?.credits ?? 0;
}

// 付与したら true、同じ idempotencyKey で処理済みなら false を返す
export async function grantCredits({ guildId, amount, type, idempotencyKey, detail }: GrantOptions) {
    try {
        await prisma.$transaction(async tx => {
            const billing = await tx.guildBilling.upsert({
                "where": { guildId },
                "create": { guildId, "credits": amount },
                "update": { "credits": { "increment": amount } }
            });

            await tx.creditTransaction.create({
                "data": { guildId, type, amount, "balanceAfter": billing.credits, idempotencyKey, detail }
            });
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
        throw error;
    }

    return true;
}

// 実際に引いたクレジットを返す。残高が足りないときは残高の分だけ引く(マイナスにはしない)
export async function consumeCredits({ guildId, amount, type, detail }: ConsumeOptions) {
    return prisma.$transaction(async tx => {
        const [row] = await tx.$queryRaw<{ credits: number }[]>`SELECT credits FROM "GuildBilling" WHERE "guildId" = ${guildId} FOR UPDATE`;
        if (!row || row.credits <= 0) return 0;

        const charged = Math.min(row.credits, amount);
        const billing = await tx.guildBilling.update({
            "where": { guildId },
            "data": { "credits": { "decrement": charged } }
        });

        await tx.creditTransaction.create({
            "data": { guildId, type, "amount": -charged, "balanceAfter": billing.credits, detail }
        });

        return charged;
    });
}
