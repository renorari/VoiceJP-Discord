// VoiceJP Web

import "dotenv/config";

import { startSubscriptionSync } from "#billing/stripe-sync.ts";
import { BASE_URL, isDatabaseConfigured } from "#lib/config.ts";
import log from "#lib/logger.ts";
import { startRecordingCleanup } from "#recordings/cleanup.ts";
import { toNodeHandler } from "better-auth/node";
import compression from "compression";
import cors from "cors";
import express from "express";

import apiRouter from "./api/index.ts";
import auth from "./auth.ts";
import { errorHandler, notFoundHandler } from "./middlewares/error.ts";
import logMiddleware from "./middlewares/log.ts";
import securityHeaders from "./middlewares/security.ts";
import siteRouter from "./site.ts";

const PORT = parseInt(process.env.PORT || "3000", 10);

const logger = log.getLogger("web");

const app = express();

app.use(securityHeaders);
app.use(compression());
app.use(cors());
app.use(logMiddleware(log.getLogger("access")));

// Better Auth は自前でボディを読むので、express.json() より前に置く
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ "extended": true }));

app.use(siteRouter);
app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler(logger));

if (isDatabaseConfigured() && process.env.STRIPE_SECRET_KEY) startSubscriptionSync();
if (isDatabaseConfigured()) startRecordingCleanup();

app.listen(PORT, (error) => {
    if (error) {
        logger.error(`Error starting VoiceJP Web Server: ${error}`);
        return;
    }

    logger.info(`VoiceJP Web Server is running on ${BASE_URL}`);
});
