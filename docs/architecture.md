# VoiceJP の構成

## ディレクトリ

```
src/
├── main.ts              Bot と Web を起動する
├── setup.ts             npm install のあとにモデルをダウンロードする
├── lib/                 アプリ全体の土台 (設定・ログ・DB・ダウンロード)
├── speech/              音声の合成と認識 (Discord に依存しない)
│   ├── audio.ts         音声の形式 (48kHz / モノラル / 16bit) と Opus の変換
│   ├── open-jtalk.ts    標準の読み上げ
│   ├── vosk.ts          標準の文字起こし (Vosk のモデル)
│   ├── openai.ts        VoiceJP+ の読み上げ・文字起こし
│   ├── transcriber.ts   話者ごとの文字起こし (VoiceJP+ と標準の切り替え)
│   └── models/          モデルのダウンロード
├── billing/             VoiceJP+ のクレジット・Stripe・エンジンの設定
├── recordings/          録音と自動文字起こし
├── discord/             Discord Bot
│   ├── index.ts         起動とイベントの配線だけ
│   ├── commands/        スラッシュコマンド (定義と振り分けは index.ts)
│   ├── events/          メッセージ・ボイスチャンネルの出入り
│   └── utils/           返信・接続の後片付けなど
├── web/                 Web サーバー
│   ├── index.ts         ミドルウェアとルーターの組み立てだけ
│   ├── site.ts          ホームページ (法律関係のページ + public/ の配信)
│   ├── api/             ダッシュボード用の API
│   ├── pages/           サーバーで組み立てるページ
│   │   └── content/     規約・プライバシーポリシーの文面 (HTML)
│   ├── guilds/          ログインしたユーザーが管理するサーバー
│   └── middlewares/
├── testing/             テスト用の部品 (DB・音声)
└── generated/           Prisma が生成する (編集しない)

public/
├── index.html, howtouse/, invite/, dashboard/    ページ
├── assets/
│   ├── css/    theme.css (色・フォント・フッター) / site.css / dashboard.css
│   ├── js/
│   ├── images/
│   └── icons/
└── favicon.ico, robots.txt, sitemap.xml
```

利用規約・プライバシーポリシー・特定商取引法に基づく表記は、`src/web/pages/content/` の文面 (または `commerce.ts`) を共通のレイアウトで組み立てます。運営者の個人情報は、環境変数 (`OPERATOR_*`) から差し込みます。

## 書き方

- import は、同じ領域 (`src/<領域>/`) の中なら相対パス、領域をまたぐときは `#lib/logger.ts` のように `#` から書く
- ファイルの中は、import → 大文字の定数 → クライアントなどの定義 → 処理 → `listen` / `login` の順
- 決まった値は定数にする。複数の領域で使う値は、その領域の `constants.ts` や `lib/config.ts` に置く
- 環境変数は `lib/config.ts` から読む (`BASE_URL`、`dashboardUrl()`、`isDatabaseConfigured()` など)
- コマンドの処理は `(interaction, state)` の形にそろえる。`client` は `interaction.client` から取る
- 色やフォントは `public/assets/css/theme.css` だけに書く (テストで確認している)
- フッターは `src/web/pages/layout.ts` の `FOOTER_HTML` と同じものを、静的なページにも書く (テストで確認している)

## テスト

```sh
npm test                                   # DB を使わないテスト
TEST_DATABASE_URL=postgresql://... npm test   # DB を使うテストも含める (本番の DB は指定しない)
```
