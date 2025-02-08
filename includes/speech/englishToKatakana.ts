import fs from "node:fs";

const dictionary: { [key: string]: string } = fs.readFileSync(__dirname + "/english.dic", "utf-8").trim().split("\n").reduce((obj: { [key: string]: string }, line: string) => {
    const [key, value] = line.trim().split(":");
    obj[key] = value;
    return obj;
}, {});

const vowelsMap = {
    "AA": "ア",
    "AE": "ア",
    "AH": "ア",
    "AO": "オ",
    "AW": "アウ",
    "AY": "アイ",
    "EH": "エ",
    "ER": "アー",
    "EY": "エイ",
    "IH": "イ",
    "IY": "イ",
    "OW": "オ",
    "OY": "オイ",
    "UH": "ウ",
    "UW": "ウ"
};

const consonantsMap = {
    "B": "ブ",
    "CH": "チ",
    "D": "ド",
    "DH": "ズ",
    "F": "フ",
    "G": "グ",
    "HH": "ハ",
    "JH": "ジ",
    "K": "ク",
    "L": "ル",
    "M": "ム",
    "N": "ン",
    "NG": "ング",
    "P": "プ",
    "R": "ル",
    "S": "ス",
    "SH": "シュ",
    "T": "ト",
    "TH": "ス",
    "V": "ヴ",
    "W": "ウ",
    "Y": "イ",
    "Z": "ズ",
    "ZH": "ジュ"
};

const vowelConsonantMap = {
    "ブア": "バ",
    "ブイ": "ビ",
    "ブウ": "ブ",
    "ブエ": "ベ",
    "ブオ": "ボ",
    "チア": "チャ",
    "チイ": "チ",
    "チウ": "チュ",
    "チエ": "チェ",
    "チオ": "チョ",
    "ドア": "ダ",
    "ドイ": "ディ",
    "ドウ": "ドゥ",
    "ドエ": "デ",
    "ドオ": "ド",
    "ズア": "ザ",
    "ズイ": "ズィ",
    "ズウ": "ズ",
    "ズエ": "ゼ",
    "ズオ": "ゾ",
    "フア": "ファ",
    "フイ": "フィ",
    "フウ": "フ",
    "フエ": "フェ",
    "フオ": "フォ",
    "グア": "グヮ",
    "グイ": "グィ",
    "グウ": "グ",
    "グエ": "グェ",
    "グオ": "グォ",
    "ハア": "ハ",
    "ハイ": "ヒ",
    "ハウ": "フ",
    "ハエ": "ヘ",
    "ハオ": "ホ",
    "ジア": "ジャ",
    "ジイ": "ジ",
    "ジウ": "ジュ",
    "ジエ": "ジェ",
    "ジオ": "ジョ",
    "クア": "カ",
    "クイ": "キ",
    "クウ": "ク",
    "クエ": "ケ",
    "クオ": "コ",
    "ルア": "ラ",
    "ルイ": "リ",
    "ルウ": "ル",
    "ルエ": "レ",
    "ルオ": "ロ",
    "ムア": "マ",
    "ムイ": "ミ",
    "ムウ": "ム",
    "ムエ": "メ",
    "ムオ": "モ",
    "ンア": "ナ",
    "ンイ": "ニ",
    "ンウ": "ヌ",
    "ンエ": "ネ",
    "ンオ": "ノ",
    "ングア": "ナ",
    "ングイ": "ニ",
    "ングウ": "ヌ",
    "ングエ": "ネ",
    "ングオ": "ノ",
    "プア": "パ",
    "プイ": "ピ",
    "プウ": "プ",
    "プエ": "ペ",
    "プオ": "ポ",
    "スア": "サ",
    "スイ": "スィ",
    "スウ": "ス",
    "スエ": "セ",
    "スオ": "ソ",
    "シュア": "シャ",
    "シュイ": "シ",
    "シュウ": "シュ",
    "シュエ": "シェ",
    "シュオ": "ショ",
    "トア": "タ",
    "トイ": "ティ",
    "トウ": "トゥ",
    "トエ": "テ",
    "トオ": "ト",
    "ヴア": "ヴァ",
    "ヴイ": "ヴィ",
    "ヴウ": "ヴ",
    "ヴエ": "ヴェ",
    "ヴオ": "ヴォ",
    "ウア": "ワ",
    "ウイ": "ウィ",
    "ウウ": "ウ",
    "ウエ": "ウェ",
    "ウオ": "ウォ",
    "イア": "ヤ",
    "イイ": "イ",
    "イウ": "ユ",
    "イエ": "イェ",
    "イオ": "ヨ",
    "ジュア": "ジャ",
    "ジュイ": "ジ",
    "ジュウ": "ジュ",
    "ジュエ": "ジェ",
    "ジュオ": "ジョ"
};

export default function englishToKatakana(text: string): string {
    const phone = text
        .toUpperCase()
        .replace(/[^A-Z\s]/g, "")
        .split(" ")
        .map((n) => n.trim())
        .filter((n) => n)
        .map((w) => {
            if (dictionary[w]) return dictionary[w];
            return w;
        });

    const phonetic = phone
        .map((p) => {
            const symbols = p.replace(/\d/g, "").split(" ");
            return symbols.map((s, i, arr) => {
                if (i === arr.length - 1 && s === "R") return "アー";
                if (vowelsMap[s as keyof typeof vowelsMap]) return vowelsMap[s as keyof typeof vowelsMap];
                if (consonantsMap[s as keyof typeof consonantsMap]) return consonantsMap[s as keyof typeof consonantsMap];
                return s;
            }).join("");
        });

    return phonetic
        .map((p) => {
            return p
                .replace(/(ブ|チ|ド|ズ|フ|グ|ハ|ジ|ク|ル|ム|ン|ング|プ|ス|シュ|ト|ヴ|ウ|イ|ジュ)(ア|イ|ウ|エ|オ|グ)/g, (match) => vowelConsonantMap[match as keyof typeof vowelConsonantMap] || match)
                .replace(/ググ/g, "グ");
        })
        .join(" ");
}