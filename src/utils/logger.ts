/*
    log4js configuration
*/

import log4js from "log4js";

log4js.configure({
    "appenders": {
        "console": { "type": "console" },
        "webFile": {
            "type": "dateFile",
            "filename": "logs/web.log",
            "pattern": "yyyy-MM-dd",
            "keepFileExt": true,
            // 5年 ≒ 1826日保持
            "numBackups": 1826,
            "compress": true,
            // 現在の出力は web.log を維持し、ローテーション時に日付付きへリネーム
            "alwaysIncludePattern": false
        },
        "discordFile": {
            "type": "dateFile",
            "filename": "logs/discord.log",
            "pattern": "yyyy-MM-dd",
            "keepFileExt": true,
            // 5年 ≒ 1826日保持
            "numBackups": 1826,
            "compress": true,
            // 現在の出力は discord.log を維持し、ローテーション時に日付付きへリネーム
            "alwaysIncludePattern": false
        }
    },
    "categories": {
        "default": {
            "appenders": ["console"],
            "level": "debug"
        },
        "web": {
            "appenders": ["console", "webFile"],
            "level": "info"
        },
        "discord": {
            "appenders": ["console", "discordFile"],
            "level": "info"
        }
    }
});

const log = log4js;

export default log;
