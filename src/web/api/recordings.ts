// Recordings API (per guild)

import express from "express";
import path from "node:path";

import { deleteRecording } from "../../recordings/cleanup.ts";
import { RECORDINGS_DIR } from "../../recordings/constants.ts";
import { formatTranscript } from "../../recordings/transcript.ts";
import prisma from "../../db/prisma.ts";
import requireSession from "../middlewares/auth.ts";
import { HttpError } from "../middlewares/error.ts";
import requireGuildManager from "../middlewares/guild.ts";

import type { TranscriptEntry } from "../../recordings/recorder.ts";

const LIST_LIMIT = 50;
const ID_PATTERN = /^[a-z0-9]+$/;

const router = express.Router();

router.use("/guilds/:guildId/recordings", requireSession, requireGuildManager);

// 別のサーバーの録音は見せない (ID を知っていても 404 にする)
async function findRecording(guildId: string, id: string) {
    const recording = ID_PATTERN.test(id) ? await prisma.recording.findUnique({ "where": { id } }) : null;
    if (!recording || recording.guildId !== guildId) throw new HttpError(404);

    return recording;
}

function transcriptOf(transcript: unknown) {
    return Array.isArray(transcript) ? transcript as TranscriptEntry[] : [];
}

router.get("/guilds/:guildId/recordings", async (req, res) => {
    const recordings = await prisma.recording.findMany({
        "where": { "guildId": req.params.guildId },
        "orderBy": { "startedAt": "desc" },
        "take": LIST_LIMIT
    });

    res.json({
        "status": "ok",
        "recordings": recordings.map(({ id, status, startedAt, durationSeconds, expiresAt, audioFile, transcript }) => ({
            id, status, startedAt, durationSeconds, expiresAt, "hasAudio": audioFile !== null, "transcriptCount": transcriptOf(transcript).length
        }))
    });
});

router.get("/guilds/:guildId/recordings/:id", async (req, res) => {
    const recording = await findRecording(req.params.guildId, req.params.id);

    res.json({ "status": "ok", "transcript": transcriptOf(recording.transcript) });
});

router.get("/guilds/:guildId/recordings/:id/audio", async (req, res) => {
    const recording = await findRecording(req.params.guildId, req.params.id);
    if (!recording.audioFile) throw new HttpError(404);

    const file = path.resolve(RECORDINGS_DIR, recording.id, recording.audioFile);
    if (req.query.download) res.attachment(`voicejp-${recording.startedAt.toISOString().slice(0, 16).replace(/[:T]/g, "-")}.m4a`);
    // sendFile は Range リクエストにも対応しているので、シークしながら再生できる
    res.type("audio/mp4").sendFile(file);
});

router.get("/guilds/:guildId/recordings/:id/transcript.txt", async (req, res) => {
    const recording = await findRecording(req.params.guildId, req.params.id);

    res.attachment(`voicejp-${recording.startedAt.toISOString().slice(0, 16).replace(/[:T]/g, "-")}.txt`);
    res.type("text/plain; charset=utf-8").send(formatTranscript(transcriptOf(recording.transcript)));
});

router.delete("/guilds/:guildId/recordings/:id", async (req, res) => {
    const recording = await findRecording(req.params.guildId, req.params.id);
    if (recording.status === "RECORDING" || recording.status === "PROCESSING") throw new HttpError(409);

    await deleteRecording(recording.id);
    res.json({ "status": "ok" });
});

export default router;
