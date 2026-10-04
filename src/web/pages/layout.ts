// Shared layout for server-rendered pages (the static pages in public/ use the same footer)

import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(import.meta.dirname, "content");
const ANALYTICS_HEAD = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1265980632516511"
        crossorigin="anonymous"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-VLSW5SRFC0"></script>`;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export const FOOTER_HTML = `<footer>
        <div id="footer-left">
            &copy; 2026 VoiceJP & Renorari
        </div>
        <div id="footer-right">
            <ul>
                <li><a href="/dashboard/">ダッシュボード</a></li>
                <li><a href="/terms.html">利用規約</a></li>
                <li><a href="/privacy.html">プライバシーポリシー</a></li>
                <li><a href="/tokushoho.html">特定商取引法に基づく表記</a></li>
                <li><a href="https://stats.uptimerobot.com/ttv9KAAUvI">サービスの状態</a></li>
                <li><a href="https://renorari.net/">運営者のサイト</a></li>
            </ul>
        </div>
    </footer>`;

export function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, character => ESCAPES[character]);
}

// 環境変数に設定された運営者の情報。未設定なら undefined
export function operatorEnv(name: string) {
    return process.env[name]?.trim() || undefined;
}

// content/ の HTML の {{key}} を差し込む (値は HTML として扱うので、利用者の入力は escapeHtml してから渡す)
export function renderContent(name: string, values: Record<string, string | number> = {}) {
    const template = fs.readFileSync(path.join(CONTENT_DIR, `${name}.html`), "utf8");

    return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
        if (!(key in values)) throw new Error(`Missing value for {{${key}}} in ${name}.html`);
        return String(values[key]);
    });
}

interface PageOptions {
    title: string;
    description: string;
    path: string;
    body: string;
}

// 本文の末尾に案内のセクションを付ける (最後のセクションだけ背景写真になる、サイトの CSS に合わせた構成)
export function renderPage({ title, description, path, body }: PageOptions) {
    return `<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta property="og:title" content="${escapeHtml(title)} | VoiceJP">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="VoiceJP">
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="https://voicejp.renorari.net${path}" />
    <title>${escapeHtml(title)} | VoiceJP</title>
    <link rel="icon" href="/favicon.ico">
    <link rel="stylesheet" href="/assets/css/theme.css">
    <link rel="stylesheet" href="/assets/css/site.css">
    ${ANALYTICS_HEAD}
</head>

<body>
    <nav>
        <h1><a href="/">VoiceJP</a> ${escapeHtml(title)}</h1>
    </nav>

    <main>
        <section class="prose" style="text-align: start;">
            ${body}
        </section>
        <section>
            <div class="section-head">
                <h2 class="big">VoiceJPと一緒に 通話を楽しみましょう</h2>
            </div>
            <a href="/invite/" class="button button-primary">今すぐDiscordアプリを導入</a>
            <a href="/dashboard/" class="button button-secondary">ダッシュボードを開く</a>
        </section>
    </main>

    ${FOOTER_HTML}
</body>

</html>
`;
}
