// 特定商取引法に基づく表記ページ

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { SUBSCRIPTION_PLANS, TOPUP_PACKS } from "#billing/constants.ts";
import renderCommercePage from "./commerce.ts";

const OPERATOR_KEYS = ["OPERATOR_NAME", "OPERATOR_ADDRESS", "OPERATOR_PHONE", "OPERATOR_EMAIL", "OPERATOR_INVOICE_NUMBER"];

function clearOperator() {
    for (const key of OPERATOR_KEYS) delete process.env[key];
}

afterEach(clearOperator);

test("運営者の情報が未設定のときは、請求があれば遅滞なく開示すると表示する (個人情報は出さない)", () => {
    clearOperator();
    const html = renderCommercePage();

    assert.equal(html.match(/請求があった場合には、購入のお申し込み前に十分な時間的余裕をもって、遅滞なく電子メールでお知らせします。/g)?.length, 3);
    assert.ok(html.includes("JuicyServer"));
    assert.ok(!html.includes("適格請求書発行事業者"));
});

test("価格は、設定したプランと追加購入の値がそのまま表示される", () => {
    const html = renderCommercePage();

    for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
        assert.ok(html.includes(`VoiceJP+ ${plan.name}プラン: 月額 ${plan.yen.toLocaleString("ja-JP")}円 (税込)、毎月 ${plan.credits.toLocaleString("ja-JP")} クレジット`), plan.name);
    }
    for (const pack of Object.values(TOPUP_PACKS)) {
        assert.ok(html.includes(`${pack.yen.toLocaleString("ja-JP")}円 (税込)、${pack.credits.toLocaleString("ja-JP")} クレジット`));
    }
});

test("法律で必要な項目 (支払方法・時期・提供時期・返品特約・解約) が含まれる", () => {
    const html = renderCommercePage();

    for (const label of ["販売価格", "商品代金以外の必要料金", "お支払方法", "お支払時期", "サービスの提供時期", "返品・返金 (返品特約)", "月額プランの解約・変更"]) {
        assert.ok(html.includes(`<dt>${label}</dt>`), label);
    }
});

test("環境変数に設定した運営者の情報が表示され、HTML として解釈されない", () => {
    process.env.OPERATOR_NAME = "山田 <script>alert(1)</script> & 太郎";
    process.env.OPERATOR_ADDRESS = "東京都〇〇区1-2-3";
    process.env.OPERATOR_PHONE = "03-0000-0000";
    process.env.OPERATOR_EMAIL = "contact@example.com";
    process.env.OPERATOR_INVOICE_NUMBER = "T1234567890123";
    const html = renderCommercePage();

    assert.ok(html.includes("山田 &lt;script&gt;alert(1)&lt;/script&gt; &amp; 太郎"));
    assert.ok(!html.includes("<script>alert(1)"));
    assert.ok(html.includes("東京都〇〇区1-2-3") && html.includes("03-0000-0000"));
    assert.ok(html.includes("<a href=\"mailto:contact@example.com\">contact@example.com</a>"));
    assert.ok(html.includes("T1234567890123"));
    assert.ok(!html.includes("請求があった場合には"));
});

test("開発環境で運営者の情報が未設定のときだけ、その旨の注意書きが出る", () => {
    const original = process.env.NODE_ENV;

    process.env.NODE_ENV = "production";
    assert.ok(!renderCommercePage().includes("開発環境の表示"));

    process.env.NODE_ENV = "development";
    assert.ok(renderCommercePage().includes("開発環境の表示"));

    process.env.OPERATOR_NAME = "山田 太郎";
    assert.ok(!renderCommercePage().includes("開発環境の表示"));

    if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original;
});
