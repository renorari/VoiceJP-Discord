// サイト全体で、フッター・共通のスタイル・リンクがそろっている

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import { FOOTER_HTML } from "./layout.ts";
import renderCommercePage from "./commerce.ts";
import renderPrivacyPage from "./privacy.ts";
import renderTermsPage from "./terms.ts";

const RENDERED_PAGES = [renderTermsPage, renderPrivacyPage, renderCommercePage];

const PUBLIC_DIR = path.join(process.cwd(), "public");
const STATIC_PAGES = ["index.html", "howtouse/index.html", "dashboard/index.html"];

function footerOf(html: string) {
    return html.match(/<footer>[\s\S]*?<\/footer>/)?.[0].replace(/\s+/g, " ").trim();
}

const expected = footerOf(FOOTER_HTML);

test("静的なページのフッターは、サーバーで作るページと同じ", async () => {
    for (const page of STATIC_PAGES) {
        assert.equal(footerOf(await fs.readFile(path.join(PUBLIC_DIR, page), "utf8")), expected, page);
    }
});

test("サーバーで作るページも同じフッターを使う", () => {
    for (const render of RENDERED_PAGES) assert.equal(footerOf(render()), expected);
});

test("すべてのページが共通の theme.css を、ページ固有のスタイルより前に読み込む", async () => {
    const pages = [
        ...(await Promise.all([...STATIC_PAGES, "invite/index.html"].map(page => fs.readFile(path.join(PUBLIC_DIR, page), "utf8")))),
        ...RENDERED_PAGES.map(render => render())
    ];

    for (const html of pages) {
        const theme = html.indexOf("/assets/css/theme.css");
        assert.ok(theme > 0, "theme.css を読み込んでいる");
        const own = [html.indexOf("/assets/css/site.css"), html.indexOf("/assets/css/dashboard.css")].filter(index => index > 0);
        assert.ok(own.every(index => theme < index), "ページ固有のスタイルより前");
    }
});

test("ページ固有のスタイルに、共通の定義と別の色やフォントを直接書いていない", async () => {
    for (const file of ["assets/css/site.css", "assets/css/dashboard.css"]) {
        const css = await fs.readFile(path.join(PUBLIC_DIR, file), "utf8");

        assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css.replace(/\/\*[\s\S]*?\*\//g, "")), `${file} に色の直接指定がある`);
        assert.ok(!/font-family/.test(css), `${file} に font-family の直接指定がある`);
    }
});

test("旧サイトのプライバシーポリシー (外部) へのリンクは残っていない", async () => {
    for (const page of STATIC_PAGES) {
        assert.ok(!(await fs.readFile(path.join(PUBLIC_DIR, page), "utf8")).includes("renorari.net/privacy.html"), page);
    }
    assert.ok(!FOOTER_HTML.includes("renorari.net/privacy.html"));
});

test("文面の {{...}} はすべて埋まっている", () => {
    for (const render of RENDERED_PAGES) assert.ok(!/\{\{\w+\}\}/.test(render()));
});
