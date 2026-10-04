// VoiceJP Web

import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";

const PORT = parseInt(process.env.PORT || "3000", 10);
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const app = express();

app.use(cors());
app.use(helmet());

app.get("/", (req, res) => {
    res.send("VoiceJP Web Server is running!");
});

app.listen(PORT, () => {
    console.log(`VoiceJP Web Server is running on ${BASE_URL}`);
});
