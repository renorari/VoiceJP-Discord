// プライバシーポリシー (文面は content/privacy.html)
// 運営者の連絡先は環境変数から読み込む (OSS なので、個人情報をリポジトリに入れないため)

import { RETENTION_DAYS } from "#recordings/constants.ts";
import { escapeHtml, operatorEnv, renderContent, renderPage } from "./layout.ts";

const DISCORD_SUPPORT_URL = "https://discord.gg/ahd4aVgxeb";
const LAST_REVISED = "2026年10月5日";

function contact() {
    const name = operatorEnv("OPERATOR_NAME");
    const email = operatorEnv("OPERATOR_EMAIL");

    return [
        `運営者: ${name ? escapeHtml(name) : "個人運営者「れのらり」"}`,
        email ? `メール: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : "",
        `Discordサーバー: <a href="${DISCORD_SUPPORT_URL}">JuicyServer</a> の運営チャンネル`
    ].filter(Boolean).join("<br>");
}

export default function renderPrivacyPage() {
    return renderPage({
        "title": "プライバシーポリシー",
        "description": "VoiceJP と VoiceJP+ のプライバシーポリシーです",
        "path": "/privacy.html",
        "body": renderContent("privacy", { "contact": contact(), "retentionDays": RETENTION_DAYS, "lastRevised": LAST_REVISED })
    });
}
