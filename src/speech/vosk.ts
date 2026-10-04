// Loaded Vosk model (shared by every free speech recognition)

import log from "#lib/logger.ts";
import ensureVoskModel from "./models/vosk.ts";
import * as vosk from "vosk";

const logger = log.getLogger("discord");

let voskModel: vosk.Model | undefined;

export async function getVoskModel() {
    voskModel ??= new vosk.Model(await ensureVoskModel());
    return voskModel;
}

// 初回起動時はバックグラウンドでモデルをダウンロードしておく
ensureVoskModel().catch(error => logger.error(error));
