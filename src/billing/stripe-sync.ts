// Sync payments from the Stripe API (no webhook needed)

import log from "#utils/logger.ts";
import prisma from "../db/prisma.ts";
import { ACTIVE_SUBSCRIPTION_STATUSES, SUBSCRIPTION_PLANS, TOPUP_PACKS } from "./constants.ts";
import { grantCredits } from "./credits.ts";
import stripe, { planIdFromProduct } from "./stripe.ts";

import type Stripe from "stripe";
import type { TopupPackId } from "./constants.ts";

const LIST_LIMIT = 100;
const SYNC_INTERVAL = 10 * 60 * 1000;

const logger = log.getLogger("billing");

async function grantInvoice(guildId: string, invoice: Stripe.Invoice) {
    const plan = planIdFromProduct(invoice.lines.data[0]?.pricing?.price_details?.product);
    if (!invoice.billing_reason?.startsWith("subscription") || !plan) return;

    await grantCredits({
        guildId,
        "amount": SUBSCRIPTION_PLANS[plan].credits,
        "type": "SUBSCRIPTION_GRANT",
        "idempotencyKey": `invoice:${invoice.id}`,
        "detail": { "invoiceId": invoice.id, plan }
    });
}

async function grantCheckout(guildId: string, session: Stripe.Checkout.Session) {
    const pack = session.metadata?.pack as TopupPackId | undefined;
    if (session.mode !== "payment" || session.payment_status !== "paid" || !pack || !(pack in TOPUP_PACKS)) return;

    await grantCredits({
        guildId,
        "amount": TOPUP_PACKS[pack].credits,
        "type": "TOPUP",
        "idempotencyKey": `checkout:${session.id}`,
        "detail": { pack, "sessionId": session.id }
    });
}

async function saveSubscription(guildId: string, subscription: Stripe.Subscription) {
    const item = subscription.items.data[0];
    const periodEnd = item?.current_period_end;

    await prisma.guildBilling.update({
        "where": { guildId },
        "data": {
            "stripeSubscriptionId": subscription.id,
            "subscriptionStatus": subscription.status,
            "subscriptionPlan": planIdFromProduct(item?.price.product) ?? null,
            "currentPeriodEnd": periodEnd ? new Date(periodEnd * 1000) : null
        }
    });
}

// 何度呼んでも同じ支払いは 1 回しか付与されない (idempotencyKey で防いでいる)
export async function syncGuildBilling(guildId: string) {
    const billing = await prisma.guildBilling.findUnique({ "where": { guildId } });
    const customer = billing?.stripeCustomerId;
    if (!customer) return;

    const [invoices, sessions, subscriptions] = await Promise.all([
        stripe.invoices.list({ customer, "status": "paid", "limit": LIST_LIMIT }),
        stripe.checkout.sessions.list({ customer, "limit": LIST_LIMIT }),
        stripe.subscriptions.list({ customer, "status": "all", "limit": 1 })
    ]);

    for (const invoice of invoices.data) await grantInvoice(guildId, invoice);
    for (const session of sessions.data) await grantCheckout(guildId, session);
    if (subscriptions.data[0]) await saveSubscription(guildId, subscriptions.data[0]);
}

// 更新日を過ぎた月額プランのサーバーだけを確認して、毎月のクレジットを付与する
export async function syncDueSubscriptions() {
    const dueGuilds = await prisma.guildBilling.findMany({
        "where": {
            "stripeCustomerId": { "not": null },
            "subscriptionStatus": { "in": ACTIVE_SUBSCRIPTION_STATUSES },
            "currentPeriodEnd": { "lt": new Date() }
        },
        "select": { "guildId": true }
    });

    for (const { guildId } of dueGuilds) {
        await syncGuildBilling(guildId).catch(error => logger.error(error));
    }
}

export function startSubscriptionSync() {
    setInterval(() => syncDueSubscriptions().catch(error => logger.error(error)), SYNC_INTERVAL);
}
