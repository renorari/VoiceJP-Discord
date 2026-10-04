// Apply Stripe webhook events to the database

import prisma from "../db/prisma.ts";
import { SUBSCRIPTION_MONTHLY_CREDITS, TOPUP_PACKS } from "./constants.ts";
import { grantCredits } from "./credits.ts";

import type Stripe from "stripe";
import type { TopupPackId } from "./constants.ts";

function customerId(customer: string | { id: string } | null) {
    return typeof customer === "string" ? customer : customer?.id;
}

async function findGuildId(customer: string | { id: string } | null) {
    const stripeCustomerId = customerId(customer);
    if (!stripeCustomerId) return undefined;

    const billing = await prisma.guildBilling.findUnique({ "where": { stripeCustomerId } });
    return billing?.guildId;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    if (!invoice.billing_reason?.startsWith("subscription")) return;

    const guildId = await findGuildId(invoice.customer);
    if (!guildId) return;

    await grantCredits({
        guildId,
        "amount": SUBSCRIPTION_MONTHLY_CREDITS,
        "type": "SUBSCRIPTION_GRANT",
        "idempotencyKey": `invoice:${invoice.id}`,
        "detail": { "invoiceId": invoice.id }
    });
}

async function handleCheckoutPaid(session: Stripe.Checkout.Session) {
    if (session.mode !== "payment" || session.payment_status !== "paid") return;

    const pack = session.metadata?.pack as TopupPackId | undefined;
    const guildId = await findGuildId(session.customer);
    if (!pack || !(pack in TOPUP_PACKS) || !guildId) return;

    await grantCredits({
        guildId,
        "amount": TOPUP_PACKS[pack].credits,
        "type": "TOPUP",
        "idempotencyKey": `checkout:${session.id}`,
        "detail": { pack, "sessionId": session.id }
    });
}

async function handleSubscription(subscription: Stripe.Subscription) {
    const guildId = await findGuildId(subscription.customer);
    if (!guildId) return;

    const periodEnd = subscription.items.data[0]?.current_period_end;
    await prisma.guildBilling.update({
        "where": { guildId },
        "data": {
            "stripeSubscriptionId": subscription.id,
            "subscriptionStatus": subscription.status,
            "currentPeriodEnd": periodEnd ? new Date(periodEnd * 1000) : null
        }
    });
}

export default async function applyStripeEvent(event: Stripe.Event) {
    switch (event.type) {
        case "invoice.paid":
            await handleInvoicePaid(event.data.object);
            break;

        // コンビニ払いなど、あとから支払いが完了するものも拾う
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded":
            await handleCheckoutPaid(event.data.object);
            break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
            await handleSubscription(event.data.object);
            break;
    }
}
