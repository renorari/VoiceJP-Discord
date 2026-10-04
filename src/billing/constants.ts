// Billing constants (1 credit = 0.1 yen)

/*
    価格の根拠 (2026-10 時点)
    - 為替: 1 USD = 160 円 (実勢 157.8 円 + 余裕)
    - 文字起こし: gpt-4o-mini-transcribe $0.003/分 = 約 0.48 円/分 (日本語対応で最安)
    - 読み上げ: tts-1 $15/100 万文字 = 100 文字あたり約 0.24 円 (日本語対応で最安)
    - 1 クレジットあたりの原価は約 0.04 円。売上は消費税 10% (内税) と Stripe 手数料
      3.6% (+ 月額は 0.7%) を引くと約 87% になるので、使い切られても利益率は約 50%
    - 高いモデル (gpt-4o-transcribe は 2 倍、gpt-4o-mini-tts は約 3 倍) に切り替えると原価割れするので、
      その場合は下の消費クレジットも上げること
    - OpenAI の料金や使うモデルを変えたときは、ここを見直すこと
*/

export const CREDITS_PER_YEN = 10;

// 使用量あたりの消費クレジット
export const TRANSCRIPTION_CREDITS_PER_MINUTE = 12;
export const SPEECH_CREDITS_PER_100_CHARACTERS = 6;

// 月額プラン (980 円) で毎月付与されるクレジット
export const SUBSCRIPTION_MONTHLY_CREDITS = 10000;

// 追加購入できるクレジットパック (金額は税込)
export const TOPUP_PACKS = {
    "small": { "yen": 500, "credits": 5000 },
    "medium": { "yen": 1000, "credits": 10500 },
    "large": { "yen": 3000, "credits": 33000 }
} as const;

export type TopupPackId = keyof typeof TOPUP_PACKS;
