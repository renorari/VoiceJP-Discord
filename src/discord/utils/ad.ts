/*
    VoiceJP Discord Bot Utility: Advertisement
*/

import "dotenv/config";

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from "discord.js";

import type { GuildTextBasedChannel, MessageCreateOptions, MessagePayload } from "discord.js";

const ads: (string | MessagePayload | MessageCreateOptions)[] = [
    {
        "content": "VoiceJPをお使いの皆さまにお知らせです",
        "embeds": [
            new EmbedBuilder()
                .setTitle("💬 VoiceJPの運営には皆さまのご支援が必要です")
                .setDescription("いつもVoiceJPをご利用いただきありがとうございます。\nVoiceJPは、AIを活用した音声合成・認識サービスを無料で提供しておりますが、その運営には多大なコストがかかっております。\n皆様のご支援があって初めて、より良いサービスを提供し続けることが可能となります。ぜひ、以下のリンクからご支援をお願いいたします。")
                .addFields(
                    {
                        "name": "🔥 Campfireからのご支援(審査中)",
                        "value": "クラウドファンディングプラットフォーム「Campfire」を通じて、VoiceJPの運営を支援していただけます。詳細は以下のリンクをご覧ください。\n[Campfire VoiceJP支援ページ](https://camp-fire.jp/projects/927913/view)"
                    },
                    {
                        "name": "🧾 PayPalからのご支援",
                        "value": "PayPalを利用して、VoiceJPの運営を直接支援していただけます。以下のリンクからご支援方法をご確認ください。\n[PayPal VoiceJP運営者宛](https://www.paypal.com/paypalme/renorari)"
                    }
                )
                .setColor(Colors.DarkBlue)
        ],
        "components": [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel("Campfireで支援する(審査中)")
                        .setStyle(ButtonStyle.Link)
                        .setURL("https://camp-fire.jp/projects/927913/view")
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setLabel("PayPalで支援する")
                        .setStyle(ButtonStyle.Link)
                        .setURL("https://www.paypal.com/paypalme/renorari")
                )
        ]
    },
    {
        "content": "新しいイベント掲載プラットフォーム「Eventapo」をご存知ですか？",
        "embeds": [
            new EmbedBuilder()
                .setTitle("📣 Eventapoでイベントを簡単に宣伝しよう！")
                .setDescription("Eventapoは、あなたのイベントを多くの人に届けるための新しいプラットフォームです。使いやすいインターフェースと豊富な機能で、イベントの告知がこれまで以上に簡単になります。ぜひ一度お試しください！")
                .addFields(
                    {
                        "name": "✨ Eventapoの特徴",
                        "value": "- 簡単なイベント登録\n- チケット販売から参加者管理まで一括サポート\n- 自動入退場管理システムで運営人数が少なくても安心"
                    },
                    {
                        "name": "🙌 今すぐ始めよう！",
                        "value": "以下のリンクからEventapoにアクセスして、あなたのイベントを登録しましょう！\n[Eventapo公式サイト](https://eventapo.com)"
                    }
                )
                .setImage("https://voicejp.renorari.net/images/ads/eventapo.png")
                .setColor(Colors.Blue)
        ],
        "components": [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel("Eventapo公式サイトへ")
                        .setStyle(ButtonStyle.Link)
                        .setURL("https://eventapo.com")
                )
        ]
    }
];

export default async function sendAdMessage(channel: GuildTextBasedChannel) {
    if (process.env.ENABLE_ADS !== "true") return;

    if (ads.length === 0) return;
    const ad = ads[Math.floor(Math.random() * ads.length)];

    if (!("createWebhook" in channel)) {
        const message = await channel.send(ad);
        setTimeout(() => {
            message.delete().catch();
        }, 10 * 60 * 1000);
        return;
    };

    const webhook = await channel.createWebhook({
        "name": "広告"
    });
    const message = await webhook.send(ad);
    await webhook.delete();
    setTimeout(() => {
        message.delete().catch();
    }, 10 * 60 * 1000);
}
