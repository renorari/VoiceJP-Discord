// 特定商取引法に基づく表記
// 運営者の情報は環境変数から読み込む (OSS なので、個人情報をリポジトリに入れないため)

import { SUBSCRIPTION_PLANS, TOPUP_PACKS } from "#billing/constants.ts";
import { escapeHtml, operatorEnv, renderPage } from "./layout.ts";

const DISCORD_SUPPORT_URL = "https://discord.gg/ahd4aVgxeb";
const UNDISCLOSED = "請求があった場合には、購入のお申し込み前に十分な時間的余裕をもって、遅滞なく電子メールでお知らせします。";

function yen(value: number) {
    return `${value.toLocaleString("ja-JP")}円`;
}

// 設定されていれば表示し、なければ「請求があれば開示する」と表示する
function operatorValue(name: string) {
    const value = operatorEnv(name);
    return value ? escapeHtml(value) : UNDISCLOSED;
}

function priceList() {
    const plans = Object.values(SUBSCRIPTION_PLANS)
        .map(plan => `<li>VoiceJP+ ${plan.name}プラン: 月額 ${yen(plan.yen)} (税込)、毎月 ${plan.credits.toLocaleString("ja-JP")} クレジット、通話の録音・自動文字起こし付き</li>`);
    const packs = Object.values(TOPUP_PACKS)
        .map(pack => `<li>VoiceJP+ クレジットの追加購入: ${yen(pack.yen)} (税込)、${pack.credits.toLocaleString("ja-JP")} クレジット</li>`);

    return `<ul>${[...plans, ...packs].join("")}</ul>金額は購入画面にも表示されます。`;
}

function rows() {
    const email = operatorEnv("OPERATOR_EMAIL");
    const invoiceNumber = operatorEnv("OPERATOR_INVOICE_NUMBER");
    const contact = [
        email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : "",
        `Discordサーバー「<a href="${DISCORD_SUPPORT_URL}">JuicyServer</a>」内の運営チャンネル`
    ].filter(Boolean).join("<br>");

    const list: [string, string][] = [
        ["サービス名", "VoiceJP+ (ボイスジェーピー・プラス)"],
        ["販売事業者", operatorValue("OPERATOR_NAME")],
        ["所在地", operatorValue("OPERATOR_ADDRESS")],
        ["電話番号", operatorValue("OPERATOR_PHONE")],
        ["お問い合わせ", contact]
    ];
    if (invoiceNumber) list.push(["適格請求書発行事業者の登録番号", escapeHtml(invoiceNumber)]);

    return [
        ...list,
        ["販売価格", priceList()],
        ["商品代金以外の必要料金", "ありません。ただし、インターネットへの接続に必要な通信費は、お客様のご負担となります。"],
        ["お支払方法", "クレジットカードなど、決済代行サービス「Stripe」が提供する決済手段 (購入画面に表示されるもの)"],
        ["お支払時期", "月額プラン: お申し込み時に初回分をお支払いいただき、以降は毎月の更新日に自動で請求されます。<br>クレジットの追加購入: ご購入時にお支払いいただきます。なお、決済手段によっては、その決済手段ごとに定められた期限までにお支払いください。"],
        ["サービスの提供時期", "決済の完了後、通常はすぐにご利用いただけます (反映に数分かかることがあります)。月額プランのクレジットは、毎月の更新日に付与されます。"],
        ["クレジットの有効期限", "ありません。"],
        ["返品・返金 (返品特約)", "VoiceJP+ はデジタルサービスのため、購入 (クレジットの付与) の後の返品・返金には応じられません。未使用のクレジットの払い戻しもできません。<br>ただし、法令で定める場合、および当方の責めに帰すべき事由により VoiceJP+ を提供できなかった場合は、返金に応じます。"],
        ["月額プランの解約・変更", "ダッシュボードの「支払いの管理」から、いつでも解約できます。次回の更新日の前までに解約すると、翌月以降の請求は発生しません。解約後も、すでにお支払いいただいた期間の終わりまでは利用できます。日割りでの返金はありません。<br>プランの変更は、次回の更新日から反映されます。"],
        ["動作環境", "Discordのアカウントが必要です。ダッシュボードのご利用には、最新のウェブブラウザが必要です。"],
        ["その他の条件", "<a href=\"/terms.html\">利用規約</a>をご確認ください。"]
    ] as [string, string][];
}

export default function renderCommercePage() {
    const developmentNote = process.env.NODE_ENV !== "production" && !operatorEnv("OPERATOR_NAME")
        ? "<p class=\"note\">(開発環境の表示) 運営者の環境変数 (OPERATOR_NAME など) が未設定のため、請求時に開示する旨の文言を表示しています。</p>"
        : "";

    return renderPage({
        "title": "特定商取引法に基づく表記",
        "description": "VoiceJP+ の特定商取引法に基づく表記です",
        "path": "/tokushoho.html",
        "body": `${developmentNote}
            <dl class="legal">
                ${rows().map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("\n                ")}
            </dl>`
    });
}
