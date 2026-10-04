// Stripe client and checkout sessions

import Stripe from "stripe";

import prisma from "../db/prisma.ts";
import { TOPUP_PACKS } from "./constants.ts";

import type { TopupPackId } from "./constants.ts";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DASHBOARD_URL = `${BASE_URL}/dashboard/`;

export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || "";
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// キーが未設定でも起動できるようにダミーを渡す (課金 API を呼んだときに Stripe 側で認証エラーになる)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_not_configured");

export default stripe;

// サーバーごとに Stripe の顧客を 1 つだけ作る
async function ensureCustomer(guildId: string) {
    const billing = await prisma.guildBilling.findUnique({ "where": { guildId } });
    if (billing?.stripeCustomerId) return billing.stripeCustomerId;

    const customer = await stripe.customers.create({ "metadata": { guildId } });
    await prisma.guildBilling.upsert({
        "where": { guildId },
        "create": { guildId, "stripeCustomerId": customer.id },
        "update": { "stripeCustomerId": customer.id }
    });

    return customer.id;
}

export async function createSubscriptionCheckout(guildId: string) {
    const session = await stripe.checkout.sessions.create({
        "mode": "subscription",
        "customer": await ensureCustomer(guildId),
        "line_items": [{ "price": SUBSCRIPTION_PRICE_ID, "quantity": 1 }],
        "metadata": { guildId },
        "success_url": `${DASHBOARD_URL}?guild=${guildId}&checkout=success`,
        "cancel_url": `${DASHBOARD_URL}?guild=${guildId}&checkout=cancel`
    });

    return session.url;
}

export async function createTopupCheckout(guildId: string, pack: TopupPackId) {
    const { yen, credits } = TOPUP_PACKS[pack];
    const session = await stripe.checkout.sessions.create({
        "mode": "payment",
        "customer": await ensureCustomer(guildId),
        "line_items": [{
            "price_data": {
                "currency": "jpy",
                "unit_amount": yen,
                "product_data": { "name": `VoiceJP クレジット ${credits.toLocaleString("ja-JP")}` }
            },
            "quantity": 1
        }],
        "metadata": { guildId, pack },
        "success_url": `${DASHBOARD_URL}?guild=${guildId}&checkout=success`,
        "cancel_url": `${DASHBOARD_URL}?guild=${guildId}&checkout=cancel`
    });

    return session.url;
}

export async function createPortalSession(guildId: string) {
    const session = await stripe.billingPortal.sessions.create({
        "customer": await ensureCustomer(guildId),
        "return_url": `${DASHBOARD_URL}?guild=${guildId}`
    });

    return session.url;
}
