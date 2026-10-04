// Billing API (per guild)

import express from "express";

import { ACTIVE_SUBSCRIPTION_STATUSES, CREDITS_PER_YEN, SPEECH_CREDITS_PER_100_CHARACTERS, SUBSCRIPTION_PLANS, TOPUP_PACKS, TRANSCRIPTION_CREDITS_PER_MINUTE } from "#billing/constants.ts";
import { changeSubscriptionPlan, createPortalSession, createSubscriptionCheckout, createTopupCheckout, isPlanId } from "#billing/stripe.ts";
import { syncGuildBilling } from "#billing/stripe-sync.ts";
import prisma from "#lib/prisma.ts";
import requireSession from "../middlewares/auth.ts";
import { HttpError } from "../middlewares/error.ts";
import requireGuildManager from "../middlewares/guild.ts";

import type { TopupPackId } from "#billing/constants.ts";

const TRANSACTION_LIMIT = 20;
const SYNC_COOLDOWN = 15 * 1000;

const lastSyncs = new Map<string, number>();

const router = express.Router();

router.get("/plans", (req, res) => {
    res.json({
        "status": "ok",
        "subscriptionPlans": SUBSCRIPTION_PLANS,
        "topupPacks": TOPUP_PACKS,
        "creditsPerYen": CREDITS_PER_YEN,
        "transcriptionCreditsPerMinute": TRANSCRIPTION_CREDITS_PER_MINUTE,
        "speechCreditsPer100Characters": SPEECH_CREDITS_PER_100_CHARACTERS
    });
});

router.use("/guilds/:guildId", requireSession, requireGuildManager);

router.get("/guilds/:guildId/billing", async (req, res) => {
    const { guildId } = req.params;
    const billing = await prisma.guildBilling.findUnique({
        "where": { guildId },
        "include": { "transactions": { "orderBy": { "createdAt": "desc" }, "take": TRANSACTION_LIMIT } }
    });

    res.json({
        "status": "ok",
        "credits": billing?.credits ?? 0,
        "subscription": { "status": billing?.subscriptionStatus ?? null, "plan": billing?.subscriptionPlan ?? null, "currentPeriodEnd": billing?.currentPeriodEnd ?? null },
        "transactions": billing?.transactions.map(({ type, amount, balanceAfter, createdAt }) => ({ type, amount, balanceAfter, createdAt })) ?? []
    });
});

// Stripe の最新の支払いを取り込む (連打されても Stripe を呼びすぎないよう間隔を空ける)
router.post("/guilds/:guildId/billing/sync", async (req, res) => {
    const { guildId } = req.params;

    if (Date.now() - (lastSyncs.get(guildId) ?? 0) > SYNC_COOLDOWN) {
        lastSyncs.set(guildId, Date.now());
        await syncGuildBilling(guildId);
    }

    res.json({ "status": "ok" });
});

router.post("/guilds/:guildId/checkout/subscription", async (req, res) => {
    const { guildId } = req.params;
    const plan = req.body?.plan;
    if (!isPlanId(plan)) throw new HttpError(400);

    const billing = await prisma.guildBilling.findUnique({ "where": { guildId } });
    if (billing?.subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.includes(billing.subscriptionStatus)) {
        throw new HttpError(409);
    }

    res.json({ "status": "ok", "url": await createSubscriptionCheckout(guildId, plan) });
});

// 加入中のプランを変更する (次回の更新日から反映)
router.post("/guilds/:guildId/subscription/plan", async (req, res) => {
    const { guildId } = req.params;
    const plan = req.body?.plan;
    if (!isPlanId(plan)) throw new HttpError(400);

    const billing = await prisma.guildBilling.findUnique({ "where": { guildId } });
    if (!billing?.stripeSubscriptionId || !billing.subscriptionStatus || !ACTIVE_SUBSCRIPTION_STATUSES.includes(billing.subscriptionStatus)) {
        throw new HttpError(400);
    }

    await changeSubscriptionPlan(billing.stripeSubscriptionId, plan);
    await syncGuildBilling(guildId);

    res.json({ "status": "ok" });
});

router.post("/guilds/:guildId/checkout/topup", async (req, res) => {
    const pack = req.body?.pack as TopupPackId;
    if (!(pack in TOPUP_PACKS)) throw new HttpError(400);

    res.json({ "status": "ok", "url": await createTopupCheckout(req.params.guildId, pack) });
});

router.post("/guilds/:guildId/portal", async (req, res) => {
    res.json({ "status": "ok", "url": await createPortalSession(req.params.guildId) });
});

export default router;
