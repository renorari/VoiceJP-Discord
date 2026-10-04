const TRANSACTION_LABELS = {
    "SUBSCRIPTION_GRANT": "月額プランの付与",
    "TOPUP": "追加購入",
    "USAGE_TRANSCRIPTION": "文字起こし",
    "USAGE_SPEECH": "読み上げ",
    "ADJUSTMENT": "調整"
};
const SUBSCRIPTION_LABELS = {
    "active": "月額プラン: 有効",
    "trialing": "月額プラン: お試し中",
    "past_due": "月額プラン: お支払いに問題があります",
    "canceled": "月額プラン: 解約済み"
};

const elements = Object.fromEntries(
    Array.from(document.querySelectorAll("[id]")).map(element => [element.id, element])
);
const params = new URLSearchParams(location.search);
const state = { "guildId": params.get("guild"), "guilds": [], "plans": null };

async function api(path, options) {
    const response = await fetch(`/api${path}`, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.messageJa || body.message || "エラーが発生しました");
        error.status = response.status;
        throw error;
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

function show(message) {
    elements.message.textContent = message || "";
    elements.message.hidden = !message;
}

async function redirectTo(path, body) {
    try {
        const { url } = await post(path, body);
        location.href = url;
    } catch (error) {
        show(error.message);
    }
}

function renderGuilds() {
    elements["guild-list"].replaceChildren(...state.guilds.map(guild => {
        const button = document.createElement("button");
        button.className = "guild";
        button.textContent = guild.name;
        button.addEventListener("click", () => selectGuild(guild.id));
        return button;
    }));
    elements.guilds.hidden = false;
}

function renderBilling(guild, billing) {
    elements["guild-name"].textContent = guild.name;
    elements.credits.textContent = billing.credits.toLocaleString("ja-JP");
    elements.subscription.textContent = SUBSCRIPTION_LABELS[billing.subscription.status] || "月額プラン: 未加入";

    const subscribed = ["active", "trialing", "past_due"].includes(billing.subscription.status);
    elements.subscribe.disabled = subscribed;
    elements.subscribe.textContent = `月額プランに申し込む (毎月 ${state.plans.subscriptionMonthlyCredits.toLocaleString("ja-JP")} クレジット)`;

    elements["transactions"].replaceChildren(...billing.transactions.map(transaction => {
        const row = document.createElement("tr");
        const cells = [
            new Date(transaction.createdAt).toLocaleString("ja-JP"),
            TRANSACTION_LABELS[transaction.type] || transaction.type,
            `${transaction.amount > 0 ? "+" : ""}${transaction.amount.toLocaleString("ja-JP")}`
        ];
        row.replaceChildren(...cells.map(text => Object.assign(document.createElement("td"), { "textContent": text })));
        return row;
    }));

    elements.billing.hidden = false;
}

async function selectGuild(guildId) {
    state.guildId = guildId;
    const guild = state.guilds.find(item => item.id === guildId);
    if (!guild) return;

    history.replaceState(null, "", `?guild=${guildId}`);
    show("");
    try {
        // 支払い直後やコンビニ払いの完了を反映するため、Stripe の最新の状態を取り込んでから表示する
        await post(`/guilds/${guildId}/billing/sync`);
        renderBilling(guild, await api(`/guilds/${guildId}/billing`));
    } catch (error) {
        show(error.message);
    }
}

async function init() {
    elements["login-button"].addEventListener("click", () => redirectTo("/auth/sign-in/social", { "provider": "discord", "callbackURL": "/dashboard/" }));
    elements.logout.addEventListener("click", async () => {
        await post("/auth/sign-out");
        location.href = "/dashboard/";
    });
    elements.subscribe.addEventListener("click", () => redirectTo(`/guilds/${state.guildId}/checkout/subscription`));
    elements.portal.addEventListener("click", () => redirectTo(`/guilds/${state.guildId}/portal`));

    try {
        const [{ user }, { guilds }, plans] = await Promise.all([api("/me"), api("/guilds"), api("/plans")]);
        state.guilds = guilds;
        state.plans = plans;

        elements.user.textContent = user.name;
        elements.logout.hidden = false;

        elements["topup-packs"].replaceChildren(...Object.entries(plans.topupPacks).map(([pack, { yen, credits }]) => {
            const button = document.createElement("button");
            button.className = "secondary";
            button.textContent = `${yen.toLocaleString("ja-JP")}円 (${credits.toLocaleString("ja-JP")} クレジット)`;
            button.addEventListener("click", () => redirectTo(`/guilds/${state.guildId}/checkout/topup`, { pack }));
            return button;
        }));

        renderGuilds();
        if (params.get("checkout") === "success") show("お支払いありがとうございます。コンビニ払いなどは、支払いの完了後に反映されます。");
        if (state.guildId) await selectGuild(state.guildId);
    } catch (error) {
        if (error.status === 401) {
            elements.login.hidden = false;
        } else {
            show(error.message);
        }
    }
}

init();
