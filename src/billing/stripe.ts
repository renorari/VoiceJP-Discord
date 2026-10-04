// Stripe client and checkout sessions

import Stripe from "stripe";

import prisma from "../db/prisma.ts";
import { SUBSCRIPTION_PLANS, TOPUP_PACKS } from "./constants.ts";

import type { SubscriptionPlanId, TopupPackId } from "./constants.ts";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DASHBOARD_URL = `${BASE_URL}/dashboard/`;
const PLAN_PRODUCT_PREFIX = "voicejp-plan-";

// キーが未設定でも起動できるようにダミーを渡す (課金 API を呼んだときに Stripe 側で認証エラーになる)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_not_configured");

export default stripe;

export function isPlanId(plan: unknown): plan is SubscriptionPlanId {
    return typeof plan === "string" && plan in SUBSCRIPTION_PLANS;
}

// Stripe の商品 ID (voicejp-plan-lite など) からプランを調べる
export function planIdFromProduct(product: string | { id: string } | null | undefined) {
    const productId = typeof product === "string" ? product : product?.id;
    const plan = productId?.startsWith(PLAN_PRODUCT_PREFIX) ? productId.slice(PLAN_PRODUCT_PREFIX.length) : undefined;

    return isPlanId(plan) ? plan : undefined;
}

// プランごとの Stripe の商品を、なければ作る (Stripe の管理画面での設定は不要)
async function ensurePlanProduct(plan: SubscriptionPlanId) {
    const id = `${PLAN_PRODUCT_PREFIX}${plan}`;

    try {
        await stripe.products.retrieve(id);
    } catch (error) {
        if (!(error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing")) throw error;
        await stripe.products.create({ id, "name": `VoiceJP ${SUBSCRIPTION_PLANS[plan].name}プラン`, "metadata": { plan } });
    }

    return id;
}

async function planPrice(plan: SubscriptionPlanId) {
    return {
        "currency": "jpy",
        "unit_amount": SUBSCRIPTION_PLANS[plan].yen,
        "recurring": { "interval": "month" as const },
        "product": await ensurePlanProduct(plan)
    };
}

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

export async function createSubscriptionCheckout(guildId: string, plan: SubscriptionPlanId) {
    const session = await stripe.checkout.sessions.create({
        "mode": "subscription",
        "customer": await ensureCustomer(guildId),
        "line_items": [{ "price_data": await planPrice(plan), "quantity": 1 }],
        "metadata": { guildId, plan },
        "success_url": `${DASHBOARD_URL}?guild=${guildId}&checkout=success`,
        "cancel_url": `${DASHBOARD_URL}?guild=${guildId}&checkout=cancel`
    });

    return session.url;
}

// 次回の更新日から新しいプランで請求される (日割りはしない)
export async function changeSubscriptionPlan(subscriptionId: string, plan: SubscriptionPlanId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await stripe.subscriptions.update(subscriptionId, {
        "items": [{ "id": subscription.items.data[0].id, "price_data": await planPrice(plan) }],
        "proration_behavior": "none"
    });
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
