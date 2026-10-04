// VoiceJP Web API

import express from "express";

import requireSession from "../middlewares/auth.ts";
import { fetchManageableGuilds } from "../utils/guilds.ts";
import billingRouter from "./billing.ts";

const router = express.Router();

router.get("/health", (req, res) => {
    res.status(200).json({ "status": "ok" });
});

router.get("/me", requireSession, (req, res) => {
    const { user } = res.locals.session;
    res.json({ "status": "ok", "user": { "id": user.id, "name": user.name, "image": user.image } });
});

router.get("/guilds", requireSession, async (req, res) => {
    res.json({ "status": "ok", "guilds": await fetchManageableGuilds(req.headers) });
});

router.use(billingRouter);

export default router;
