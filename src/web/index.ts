// VoiceJP Web

import "dotenv/config";

import log from "#utils/logger.ts";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import logMiddleware from "./middlewares/log.ts";

const PORT = parseInt(process.env.PORT || "3000", 10);
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const logger = log.getLogger("web");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ "extended": true }));
app.use(logMiddleware(log.getLogger("access")));

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("VoiceJP Web Server is running!");
});

app.listen(PORT, (error) => {
    if (error) {
        logger.error(`Error starting VoiceJP Web Server: ${error}`);
        return;
    }

    logger.info(`VoiceJP Web Server is running on ${BASE_URL}`);
});
