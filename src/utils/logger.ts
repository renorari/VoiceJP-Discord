// log4js

import log4js from "log4js";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function dateFileAppender(name: string) {
    return {
        "type": "dateFile",
        "filename": `logs/${name}.log`,
        "pattern": "yyyy-MM-dd",
        "keepFileExt": true,
        "numBackups": 1826,
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
