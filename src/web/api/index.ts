// VoiceJP Web API

import express from "express";

import requireSession from "../middlewares/auth.ts";
import summarizeGuilds from "../guilds/summary.ts";
import { fetchManageableGuilds } from "../guilds/manageable.ts";
import billingRouter from "./billing.ts";
import recordingsRouter from "./recordings.ts";
import settingsRouter from "./settings.ts";

const router = express.Router();

router.get("/health", (req, res) => {
    res.status(200).json({ "status": "ok" });
});

router.get("/me", requireSession, (req, res) => {
    const { user } = res.locals.session;
    res.json({ "status": "ok", "user": { "id": user.id, "name": user.name, "image": user.image } });
});

router.get("/guilds", requireSession, async (req, res) => {
    const guilds = await fetchManageableGuilds(res.locals.session.user.id, req.headers);
    res.json({ "status": "ok", "guilds": await summarizeGuilds(guilds) });
});

router.use(billingRouter);
router.use(recordingsRouter);
router.use(settingsRouter);

export default router;
