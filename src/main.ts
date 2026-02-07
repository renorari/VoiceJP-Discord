/*
    VoiceJP
*/

import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";

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
    res.status(404).json({ "status": "error", "message": "Not Found" });
});

server.listen(PORT, () => {
    logger.info(`listening on ${BASE_URL}`);
});
