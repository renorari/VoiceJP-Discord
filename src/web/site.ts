// The website: legal pages rendered on the server, and the static files in public/

import express from "express";

import renderCommercePage from "./pages/commerce.ts";
import renderPrivacyPage from "./pages/privacy.ts";
import renderTermsPage from "./pages/terms.ts";

const PUBLIC_DIR = "public";
const SASHIMI_UI_DIR = "node_modules/sashimi-ui/dist/css";
const IMAGE_MAX_AGE = 7 * 24 * 60 * 60;
const IMAGE_PATTERN = /\.(webp|png|jpg|svg|ico)$/;

// 運営者の情報を環境変数から入れるページもあるので、法律関係のページは毎回組み立てる
const RENDERED_PAGES: Record<string, () => string> = {
    "/terms.html": renderTermsPage,
    "/privacy.html": renderPrivacyPage,
    "/tokushoho.html": renderCommercePage
};

const router = express.Router();

for (const [pagePath, render] of Object.entries(RENDERED_PAGES)) {
    router.get(pagePath, (req, res) => {
        res.setHeader("Cache-Control", "no-cache");
        res.type("html").send(render());
    });
}

// 画像は /assets/images/ に移したので、SNS などに残っている古い URL を転送する
router.get("/images/*splat", (req, res) => {
    res.redirect(301, `/assets${req.path}`);
});

router.use("/vendor/sashimi-ui", express.static(SASHIMI_UI_DIR));
router.use(express.static(PUBLIC_DIR, {
    // 画像は長く、HTML・CSS・JS は毎回確認 (変更があったときだけ再取得) させる
    "setHeaders": (res, filePath) => {
        res.setHeader("Cache-Control", IMAGE_PATTERN.test(filePath) ? `public, max-age=${IMAGE_MAX_AGE}` : "no-cache");
    }
}));

export default router;
