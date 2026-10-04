const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];
const LOW_CREDITS = 500;
const DISCORD_CDN = "https://cdn.discordapp.com";
const TRANSACTION_LABELS = {
    "SUBSCRIPTION_GRANT": "月額プランの付与",
    "TOPUP": "追加購入",
    "USAGE_TRANSCRIPTION": "文字起こし",
    "USAGE_SPEECH": "読み上げ",
    "ADJUSTMENT": "調整"
};
const MESSAGES = {
    "standard": "標準モード (無料) で動作しています。クレジットを追加すると、高精度なAIの文字起こしと読み上げが使えます。",
    "low": "クレジットが残りわずかです。無くなると、自動で標準モード (無料) に切り替わります。",
    "premium": "高精度モードが有効です。このサーバーの文字起こしと読み上げは、AIで処理されます。",
    "paid": "お支払いありがとうございます。反映されるまで少しかかることがあります。コンビニ払いなどは、支払いの完了後に反映されます。",
    "pastDue": "お支払いに失敗しています。「支払いの管理」から支払い方法を更新してください。"
};

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const state = { "user": null, "guilds": [], "plans": null, "guild": null, "billing": null };

// --- 基本の部品 ---

function h(tag, props = {}, ...children) {
    const element = Object.assign(document.createElement(tag), props);
    element.append(...children);
    return element;
}

async function api(path, options) {
    const response = await fetch(`/api${path}`, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw Object.assign(new Error(body.messageJa || body.message || "エラーが発生しました"), { "status": response.status });
    }
    return body;
}

function post(path, body) {
    return api(path, {
        "method": "POST",
        "headers": { "Content-Type": "application/json" },
        "body": JSON.stringify(body || {})
    });
}

function showView(name) {
    for (const view of document.querySelectorAll(".view")) view.hidden = view.id !== `view-${name}`;
    window.scrollTo(0, 0);
}

function notice(type, text) {
    $("notice").className = `callout ${type}`;
    $("notice").textContent = text;
    $("notice").hidden = false;
}

function clearNotice() {
    $("notice").hidden = true;
}

// 押したボタンを処理中にして、二重に押されるのを防ぐ
async function run(button, task) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "処理中…";
    try {
        return await task();
    } catch (error) {
        notice("destructive", error.message);
    } finally {
        button.disabled = false;
        button.textContent = label;
    }
}

async function redirectTo(path, body) {
    const { url } = await post(path, body);
    location.href = url;
}

function confirmDialog(title, message, okLabel) {
    const dialog = $("confirm");
    $("confirm-title").textContent = title;
    $("confirm-message").textContent = message;
    dialog.querySelector("[value=ok]").textContent = okLabel;

    return new Promise(resolve => {
        dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { "once": true });
        dialog.showModal();
    });
}

// --- 表示用の整形 ---

const yen = value => `${value.toLocaleString("ja-JP")}円`;
const number = value => value.toLocaleString("ja-JP");
const formatDate = value => new Date(value).toLocaleDateString("ja-JP", { "year": "numeric", "month": "long", "day": "numeric" });
const formatDateTime = value => new Date(value).toLocaleString("ja-JP", { "month": "numeric", "day": "numeric", "hour": "2-digit", "minute": "2-digit" });

// クレジットを、文字起こしの時間と読み上げの文字数に直した目安
function estimate(credits) {
    if (credits <= 0) return { "transcription": "-", "speech": "-" };

    const minutes = Math.floor(credits / state.plans.transcriptionCreditsPerMinute);
    const characters = Math.floor(credits / state.plans.speechCreditsPer100Characters * 100);

    return {
        "transcription": minutes >= 60 ? `約 ${(minutes / 60).toFixed(1)} 時間` : `約 ${number(minutes)} 分`,
        "speech": characters >= 10000 ? `約 ${(characters / 10000).toFixed(1)} 万文字` : `約 ${number(characters)} 文字`
    };
}

function guildIcon(guild, large) {
    const className = large ? "guild-icon large" : "guild-icon";
    if (guild.icon) {
        return h("img", { className, "src": `${DISCORD_CDN}/icons/${guild.id}/${guild.icon}.png?size=96`, "alt": "", "width": 40, "height": 40 });
    }
    return h("span", { "className": `${className} placeholder`, "textContent": guild.name.slice(0, 1) });
}

function isSubscribed() {
    return ACTIVE_SUBSCRIPTION_STATUSES.includes(state.billing.subscription.status);
}

// --- 画面の描画 ---

function renderGuildList() {
    const list = $("guild-list");
    list.replaceChildren(...state.guilds.map(guild => {
        const button = h("button", { "type": "button" },
            guildIcon(guild),
            h("span", { "className": "name", "textContent": guild.name }),
            h("span", { "className": "chevron", "textContent": "›" })
        );
        button.querySelector(".chevron").setAttribute("aria-hidden", "true");
        button.addEventListener("click", () => selectGuild(guild.id));
        return h("li", {}, button);
    }));
    $("guild-empty").hidden = state.guilds.length > 0;
}

function renderStatus() {
    const { credits, subscription } = state.billing;
    const [type, message] = credits <= 0 ? ["info", MESSAGES.standard] : credits <= LOW_CREDITS ? ["warning", MESSAGES.low] : ["success", MESSAGES.premium];

    $("status").className = `callout ${type}`;
    $("status").textContent = message;

    if (subscription.status === "past_due") notice("warning", MESSAGES.pastDue);
}

function renderSummary() {
    const { credits } = state.billing;
    const rates = estimate(credits);

    $("credits").textContent = number(credits);
    $("estimate-transcription").textContent = rates.transcription;
    $("estimate-speech").textContent = rates.speech;
}

function renderSubscriptionInfo() {
    const { subscription } = state.billing;
    const info = $("subscription-info");
    const plan = state.plans.subscriptionPlans[subscription.plan];

    if (!isSubscribed() || !plan) {
        info.hidden = true;
        return;
    }

    const rows = [
        ["加入中のプラン", `${plan.name} (月 ${yen(plan.yen)})`],
        ["次回の更新日", subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "-"]
    ];
    info.replaceChildren(...rows.flatMap(([key, value]) => [h("dt", { "textContent": key }), h("dd", { "textContent": value })]));
    info.hidden = false;
}

function planCard(id, plan) {
    const { subscription } = state.billing;
    const subscribed = isSubscribed();
    const current = subscribed && subscription.plan === id;
    const rates = estimate(plan.credits);

    const button = h("button", {
        "className": subscribed && !current ? "button secondary" : "button",
        "type": "button",
        "disabled": current,
        "textContent": current ? "加入中" : subscribed ? "このプランに変更" : "申し込む"
    });
    button.addEventListener("click", () => run(button, () => subscribed ? changePlan(id, plan) : redirectTo(`/guilds/${state.guild.id}/checkout/subscription`, { "plan": id })));

    return h("article", { "className": current ? "card-item current" : "card-item" },
        h("div", { "className": "title" }, h("span", { "textContent": plan.name }), current ? h("span", { "className": "chip active", "textContent": "加入中" }) : ""),
        h("div", { "className": "price" }, yen(plan.yen), h("small", { "textContent": " / 月" })),
        h("p", { "className": "detail", "textContent": `毎月 ${number(plan.credits)} クレジット` }),
        h("p", { "className": "detail", "textContent": `文字起こし ${rates.transcription}、または読み上げ ${rates.speech}` }),
        button
    );
}

function packCard(id, pack) {
    const rates = estimate(pack.credits);
    const bonus = Math.round((pack.credits / (pack.yen * state.plans.creditsPerYen) - 1) * 100);

    const button = h("button", { "className": "button secondary", "type": "button", "textContent": "購入する" });
    button.addEventListener("click", () => run(button, () => redirectTo(`/guilds/${state.guild.id}/checkout/topup`, { "pack": id })));

    return h("article", { "className": "card-item" },
        h("div", { "className": "title" }, h("span", { "textContent": `${number(pack.credits)} クレジット` }), bonus > 0 ? h("span", { "className": "chip active", "textContent": `${bonus}% お得` }) : ""),
        h("div", { "className": "price", "textContent": yen(pack.yen) }),
        h("p", { "className": "detail", "textContent": `文字起こし ${rates.transcription}、または読み上げ ${rates.speech}` }),
        button
    );
}

function renderHistory() {
    const { transactions } = state.billing;

    $("history-body").replaceChildren(...transactions.map(transaction => h("tr", {},
        h("td", { "textContent": formatDateTime(transaction.createdAt) }),
        h("td", { "textContent": TRANSACTION_LABELS[transaction.type] || transaction.type }),
        h("td", { "className": `num ${transaction.amount > 0 ? "plus" : "minus"}`, "textContent": `${transaction.amount > 0 ? "+" : ""}${number(transaction.amount)}` }),
        h("td", { "className": "num", "textContent": number(transaction.balanceAfter) })
    )));
    $("history").hidden = transactions.length === 0;
    $("history-empty").hidden = transactions.length > 0;
}

function renderBilling() {
    $("guild-icon-slot").replaceChildren(guildIcon(state.guild, true));
    $("guild-name").textContent = state.guild.name;

    renderStatus();
    renderSummary();
    renderSubscriptionInfo();
    $("plans").replaceChildren(...Object.entries(state.plans.subscriptionPlans).map(([id, plan]) => planCard(id, plan)));
    $("packs").replaceChildren(...Object.entries(state.plans.topupPacks).map(([id, pack]) => packCard(id, pack)));
    renderHistory();
}

function showPanel(name) {
    for (const tab of document.querySelectorAll(".tab-item")) {
        const active = tab.dataset.panel === name;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        $(`panel-${tab.dataset.panel}`).hidden = !active;
    }
}

// --- 操作 ---

async function loadBilling() {
    // 支払い直後やコンビニ払いの完了を反映するため、Stripe の最新の状態を取り込んでから表示する
    await post(`/guilds/${state.guild.id}/billing/sync`);
    state.billing = await api(`/guilds/${state.guild.id}/billing`);
    renderBilling();
}

async function selectGuild(guildId) {
    const guild = state.guilds.find(item => item.id === guildId);
    if (!guild) return showView("guilds");

    clearNotice();
    state.guild = guild;
    history.replaceState(null, "", `?guild=${guildId}`);

    try {
        await loadBilling();
        showView("billing");
        showPanel("plans");
    } catch (error) {
        notice("destructive", error.message);
        showView("guilds");
    }
}

async function changePlan(id, plan) {
    const current = state.plans.subscriptionPlans[state.billing.subscription.plan];
    const renewal = state.billing.subscription.currentPeriodEnd ? formatDate(state.billing.subscription.currentPeriodEnd) : "次回の更新日";
    const message = `${renewal}から、${plan.name}プラン (月 ${yen(plan.yen)}) になり、毎月 ${number(plan.credits)} クレジットが付与されます。今月分はそのままです。`;

    if (!await confirmDialog(`${current ? `${current.name}から` : ""}${plan.name}に変更しますか?`, message, "変更する")) return;

    await post(`/guilds/${state.guild.id}/subscription/plan`, { "plan": id });
    await loadBilling();
    notice("success", `プランを変更しました。${renewal}から${plan.name}プランで請求されます。`);
}

function showAccount() {
    $("user-name").textContent = state.user.name;
    if (state.user.image) {
        $("avatar").src = state.user.image;
    } else {
        $("avatar").hidden = true;
    }
    $("account").hidden = false;
}

function bindEvents() {
    $("login").addEventListener("click", event => run(event.currentTarget, () => redirectTo("/auth/sign-in/social", { "provider": "discord", "callbackURL": "/dashboard/" })));
    $("logout").addEventListener("click", event => run(event.currentTarget, async () => {
        await post("/auth/sign-out");
        location.href = "/dashboard/";
    }));
    $("portal").addEventListener("click", event => run(event.currentTarget, () => redirectTo(`/guilds/${state.guild.id}/portal`)));
    $("back").addEventListener("click", () => {
        clearNotice();
        history.replaceState(null, "", "/dashboard/");
        showView("guilds");
    });

    const tabs = Array.from(document.querySelectorAll(".tab-item"));
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => showPanel(tab.dataset.panel));
        tab.addEventListener("keydown", event => {
            const next = { "ArrowRight": 1, "ArrowLeft": -1 }[event.key];
            if (!next) return;

            const target = tabs[(index + next + tabs.length) % tabs.length];
            showPanel(target.dataset.panel);
            target.focus();
        });
    });
}

async function init() {
    bindEvents();

    try {
        const [{ user }, { guilds }, plans] = await Promise.all([api("/me"), api("/guilds"), api("/plans")]);
        Object.assign(state, { user, guilds, plans });
    } catch (error) {
        if (error.status !== 401) notice("destructive", error.message);
        return showView("login");
    }

    showAccount();
    renderGuildList();

    const guildId = params.get("guild") || (state.guilds.length === 1 ? state.guilds[0].id : null);
    if (guildId) {
        await selectGuild(guildId);
        if (params.get("checkout") === "success") notice("success", MESSAGES.paid);
    } else {
        showView("guilds");
    }
}

init();
