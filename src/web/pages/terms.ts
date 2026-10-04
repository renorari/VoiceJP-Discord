// 利用規約 (文面は content/terms.html)

import { RETENTION_DAYS } from "#recordings/constants.ts";
import { renderContent, renderPage } from "./layout.ts";

export default function renderTermsPage() {
    return renderPage({
        "title": "利用規約",
        "description": "VoiceJP と VoiceJP+ の利用規約です",
        "path": "/terms.html",
        "body": renderContent("terms", { "retentionDays": RETENTION_DAYS })
    });
}
