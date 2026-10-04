// プライバシーポリシーページ

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { RETENTION_DAYS } from "../../recordings/constants.ts";
import renderPrivacyPage from "./privacy.ts";

const OPERATOR_KEYS = ["OPERATOR_NAME", "OPERATOR_EMAIL"];

afterEach(() => {
    for (const key of OPERATOR_KEYS) delete process.env[key];
});

test("取得する情報・利用目的・音声の扱い・保存期間・Cookie・請求の窓口が含まれる", () => {
    const html = renderPrivacyPage();

    for (const heading of ["事業者情報", "取得する情報", "利用目的", "通話の音声とメッセージの取り扱い", "保存する期間", "第三者への提供と委託", "外国にある事業者への提供", "Cookieとアクセス解析・広告", "開示・訂正・削除などの請求"]) {
        assert.ok(html.includes(`<h2>${heading}</h2>`), heading);
    }
    for (const service of ["OpenAI", "Stripe", "Discord", "Googleアナリティクス", "Google AdSense"]) {
        assert.ok(html.includes(service), service);
    }
    assert.ok(html.includes(`録音を開始した日から${RETENTION_DAYS}日`));
});

test("運営者の名前を設定していなければ個人運営者として表示し、設定すれば連絡先が出る (HTML は無効化される)", () => {
    assert.ok(renderPrivacyPage().includes("個人運営者「れのらり」"));

    process.env.OPERATOR_NAME = "山田 <b>太郎</b>";
    process.env.OPERATOR_EMAIL = "contact@example.com";
    const html = renderPrivacyPage();

    assert.ok(html.includes("運営者: 山田 &lt;b&gt;太郎&lt;/b&gt;"));
    assert.ok(!html.includes("<b>太郎"));
    assert.ok(html.includes("<a href=\"mailto:contact@example.com\">contact@example.com</a>"));
});
