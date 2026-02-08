/*
    VoiceJP Discord Bot i18n configuration
*/

import i18n from "i18n";
import path from "node:path";

i18n.configure({
    "locales": ["ja"],
    "defaultLocale": "ja",
    "directory": path.join(process.cwd(), "locales"),
    "objectNotation": true,
    "syncFiles": false,
    "updateFiles": false
});

i18n.setLocale("ja");

export default i18n;
