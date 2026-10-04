// Billing constants (1 credit = 0.1 yen)

export const CREDITS_PER_YEN = 10;

// 使用量あたりの消費クレジット
export const TRANSCRIPTION_CREDITS_PER_MINUTE = 20;
export const SPEECH_CREDITS_PER_100_CHARACTERS = 6;

// 月額プランで毎月付与されるクレジット
export const SUBSCRIPTION_MONTHLY_CREDITS = 6000;

// 追加購入できるクレジットパック
export const TOPUP_PACKS = {
    "small": { "yen": 500, "credits": 3000 },
    "medium": { "yen": 1000, "credits": 6500 },
    "large": { "yen": 3000, "credits": 21000 }
} as const;

export type TopupPackId = keyof typeof TOPUP_PACKS;
