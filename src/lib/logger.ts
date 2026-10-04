// log4js

import log4js from "log4js";

import { IS_PRODUCTION } from "./config.ts";

const LOG_DIR = "logs";
const DATE_PATTERN = "yyyy-MM-dd";
const NUM_BACKUPS = 1826;

function dateFileAppender(name: string) {
    return {
        "type": "dateFile",
        "filename": `${LOG_DIR}/${name}.log`,
        "pattern": DATE_PATTERN,
        "keepFileExt": true,
        "numBackups": NUM_BACKUPS,
        "compress": true
    };
}

log4js.configure({
    "appenders": {
        "console": { "type": "console" },
        "appFile": dateFileAppender("app"),
        "accessFile": dateFileAppender("access"),
        "appFileInfo": { "type": "logLevelFilter", "appender": "appFile", "level": "info" },
        "consoleInfo": { "type": "logLevelFilter", "appender": "console", "level": "info" }
    },
    "categories": {
        "default": {
            "appenders": IS_PRODUCTION ? ["consoleInfo", "appFileInfo"] : ["console"],
            "level": "debug"
        },
        "access": {
            "appenders": ["console", "accessFile"],
            "level": "info"
        }
    }
});

export default log4js;
