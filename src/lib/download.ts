// Zip downloader

import cp from "node:child_process";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

import log from "./logger.ts";

import type { ReadableStream } from "node:stream/web";

const PROGRESS_STEP = 10;

const logger = log.getLogger("download");
const execFile = promisify(cp.execFile);

export function exists(target: string) {
    return fs.access(target).then(() => true, () => false);
}

// 同時に何度呼ばれても 1 回だけ実行し、失敗したときは次回やり直せるようにする
export function once<T>(task: () => Promise<T>) {
    let promise: Promise<T> | undefined;

    return () => promise ??= task().catch(error => {
        promise = undefined;
        throw error;
    });
}

// zip をダウンロードして tempPath/extracted に展開し、そのパスを返す
export async function downloadZip(url: string, tempPath: string) {
    const zipPath = path.join(tempPath, "download.zip");
    const extractPath = path.join(tempPath, "extracted");

    await fs.rm(tempPath, { "recursive": true, "force": true });
    await fs.mkdir(extractPath, { "recursive": true });

    const response = await fetch(url);
    if (!response.ok || !response.body) {
        throw new Error(`Failed to download: ${url} (${response.status})`);
    }

    const total = Number(response.headers.get("content-length"));
    const body = Readable.fromWeb(response.body as ReadableStream);
    let received = 0;
    let logged = 0;
    body.on("data", (chunk: Buffer) => {
        received += chunk.length;
        const percent = Math.floor(received / total * 100 / PROGRESS_STEP) * PROGRESS_STEP;
        if (total > 0 && percent > logged) {
            logged = percent;
            logger.info(`Downloading ${url} ... ${percent}%`);
        }
    });
    await pipeline(body, createWriteStream(zipPath));

    await execFile("unzip", ["-q", zipPath, "-d", extractPath]);

    return extractPath;
}
