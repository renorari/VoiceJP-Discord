// Stripe webhook endpoint (needs the raw request body)

import applyStripeEvent from "../../billing/stripe-events.ts";
import stripe, { WEBHOOK_SECRET } from "../../billing/stripe.ts";
import { HttpError } from "../middlewares/error.ts";

import type { Request, Response } from "express";
import type Stripe from "stripe";

export default async function handleStripeWebhook(req: Request, res: Response) {
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"] ?? "", WEBHOOK_SECRET);
    } catch {
        throw new HttpError(400);
    }

    await applyStripeEvent(event);
    res.json({ "received": true });
}
