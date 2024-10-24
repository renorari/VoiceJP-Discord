/* VoiceJP Folder Manager */

import fs from "node:fs";
import path from "node:path";

if (!fs.existsSync(path.join(__dirname, "temp"))) {
    fs.mkdirSync(path.join(__dirname, "temp"));
} else {
    fs.readdirSync(path.join(__dirname, "temp")).forEach((file) => {
        fs.unlinkSync(path.join(__dirname, "temp", file));
    });
}