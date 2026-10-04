// 料金プランを API から取り出して表示する (金額はサーバー側の設定が正)

const planList = document.getElementById("plan-list");
const packList = document.getElementById("pack-list");

function card(title, price, lines) {
    const element = document.createElement("div");
    element.className = "card card-3";

    const heading = document.createElement("h3");
    heading.textContent = title;
    const priceElement = document.createElement("div");
    priceElement.className = "price";
    priceElement.textContent = price;
    element.append(heading, priceElement);

    for (const line of lines) {
        const detail = document.createElement("p");
        detail.className = "detail";
        detail.textContent = line;
        element.append(detail);
    }

    return element;
}

async function render() {
    try {
        const response = await fetch("/api/plans");
        if (!response.ok) return;

        const { subscriptionPlans, topupPacks } = await response.json();
        const yen = value => `${value.toLocaleString("ja-JP")}円`;
        const number = value => value.toLocaleString("ja-JP");

        const plans = Object.values(subscriptionPlans).map(plan => card(`VoiceJP+ ${plan.name}`, `${yen(plan.yen)} / 月`, [`毎月 ${number(plan.credits)} クレジット`, "通話の録音・自動文字起こし付き"]));
        const packs = Object.values(topupPacks).map(pack => card(`VoiceJP+ ${number(pack.credits)} クレジット`, yen(pack.yen), ["必要なときに追加購入"]));

        planList.replaceChildren(...plans);
        packList.replaceChildren(...packs);
    } catch {
        // 取得できないときは、料金の欄は表示しない
        document.getElementById("plans").hidden = true;
    }
}

render();
