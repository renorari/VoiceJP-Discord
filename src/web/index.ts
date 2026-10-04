// VoiceJP Web

import "dotenv/config";

import { startSubscriptionSync } from "#billing/stripe-sync.ts";
import log from "#utils/logger.ts";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import apiRouter from "./api/index.ts";
import auth from "./auth.ts";
import { errorHandler, notFoundHandler } from "./middlewares/error.ts";
import logMiddleware from "./middlewares/log.ts";

const PUBLIC_DIR = "public";
const SASHIMI_UI_DIR = "node_modules/sashimi-ui/dist/css";
const STRICT_PATHS = ["/dashboard", "/api", "/vendor"];
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PORT = parseInt(process.env.PORT || "3000", 10);
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const logger = log.getLogger("web");

const app = express();

// ダッシュボードと API は厳しい設定にする。ダッシュボードで Discord のアイコンを表示するため、画像は Discord の CDN も許可する
// Safari は localhost の http でも https への自動切り替えをするので、本番以外ではそれを外す
const strictHelmet = helmet({
    "contentSecurityPolicy": {
        "directives": {
            "img-src": ["'self'", "data:", "https://cdn.discordapp.com"],
            ...IS_PRODUCTION ? {} : { "upgrade-insecure-requests": null }
        }
    },
    "strictTransportSecurity": IS_PRODUCTION
});
// 紹介ページは Google アナリティクスや AdSense を読み込むので、CSP は付けない
const siteHelmet = helmet({
    "contentSecurityPolicy": false,
    "strictTransportSecurity": IS_PRODUCTION
});

app.use((req, res, next) => (STRICT_PATHS.some(path => req.path.startsWith(path)) ? strictHelmet : siteHelmet)(req, res, next));
app.use(cors());
app.use(logMiddleware(log.getLogger("access")));

// Better Auth は自前でボディを読むので、express.json() より前に置く
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ "extended": true }));

app.use("/vendor/sashimi-ui", express.static(SASHIMI_UI_DIR));
app.use(express.static(PUBLIC_DIR));

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler(logger));

if (process.env.DATABASE_URL && process.env.STRIPE_SECRET_KEY) startSubscriptionSync();

app.listen(PORT, (error) => {
    if (error) {
        logger.error(`Error starting VoiceJP Web Server: ${error}`);
        return;
    }

    logger.info(`VoiceJP Web Server is running on ${BASE_URL}`);
});
