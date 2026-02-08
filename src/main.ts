/*
    VoiceJP
*/

import "dotenv/config";
import "./discord/index.ts";

import cors from "cors";
import express from "express";
import helmet from "helmet";

import i18n from "./i18n.ts";
import log from "./utils/logger.ts";
import accessLogMiddleware from "./utils/middlewares/log.ts";

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const server = express();
const logger = log.getLogger();

server.use(helmet());
server.use(cors());
server.use(accessLogMiddleware(log.getLogger("access")));
server.use(express.json());
server.use(express.urlencoded({ "extended": true }));

server.use(express.static("public"));

server.use((req, res) => {
    res.status(404).json({ "status": "error", "message": i18n.__("public.server.notFound") });
});

server.listen(PORT, () => {
    logger.info(i18n.__("internal.server.listening", BASE_URL));
});
