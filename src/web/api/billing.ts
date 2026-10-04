// Billing API (per guild)

import express from "express";

import { SUBSCRIPTION_MONTHLY_CREDITS, TOPUP_PACKS } from "../../billing/constants.ts";
import { createPortalSession, createSubscriptionCheckout, createTopupCheckout } from "../../billing/stripe.ts";
import prisma from "../../db/prisma.ts";
import requireSession from "../middlewares/auth.ts";
import { HttpError } from "../middlewares/error.ts";
import requireGuildManager from "../middlewares/guild.ts";

import type { TopupPackId } from "../../billing/constants.ts";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];
const TRANSACTION_LIMIT = 20;

const router = express.Router();

router.get("/plans", (req, res) => {
    res.json({ "status": "ok", "subscriptionMonthlyCredits": SUBSCRIPTION_MONTHLY_CREDITS, "topupPacks": TOPUP_PACKS });
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
        "subscription": { "status": billing?.subscriptionStatus ?? null, "currentPeriodEnd": billing?.currentPeriodEnd ?? null },
        "transactions": billing?.transactions.map(({ type, amount, balanceAfter, createdAt }) => ({ type, amount, balanceAfter, createdAt })) ?? []
    });
});

router.post("/guilds/:guildId/checkout/subscription", async (req, res) => {
    const { guildId } = req.params;
    const billing = await prisma.guildBilling.findUnique({ "where": { guildId } });
    if (billing?.subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.includes(billing.subscriptionStatus)) {
        throw new HttpError(409);
    }

    res.json({ "status": "ok", "url": await createSubscriptionCheckout(guildId) });
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
