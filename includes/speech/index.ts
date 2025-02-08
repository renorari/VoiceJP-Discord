/* Voice API */
import "dotenv/config";

import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import englishToKatakana from "./englishToKatakana";

const osDicMap: Record<string, string> = {
    win32: "C:/open_jtalk/dic",
    darwin: "/opt/homebrew/opt/open-jtalk/dic",
    linux: "/var/lib/mecab/dic/open-jtalk/naist-jdic"
};
const dic = process.env.JTALK_DICT ?? osDicMap[process.platform] ?? osDicMap.linux;

interface VoiceDictionary {
    [key: string]: string;
}

const dictionary: VoiceDictionary = fs.readFileSync(path.join(__dirname, "dictionary.dic"), "utf-8")
    .split("\n")
    .reduce((obj: VoiceDictionary, line: string) => {
        const [key, value] = line.split(":");
        obj[key] = value;
        return obj;
    }, {});


async function generateVoice(text: string, filepath: string, model: string, speed: number, tone: number, intonation: number, volume: number, between: number): Promise<string> {
    if (!speed) throw new Error("Speed is not defined");

    const processedText = text.toLowerCase()
        .replace(/[a-z]+/g, (match) => englishToKatakana(match))
        .replace(new RegExp(Object.keys(dictionary).join("|"), "g"), (match) => dictionary[match]);

    const texts: string[] = processedText
        .trim()
        .split(/。|\n|\.|,/);

    const promises = texts
        .filter((n) => n)
        .map(async (_text, index) => {
            if (_text === "") return;
            const filePath = path.join(`${filepath}_${index}.wav`);
            await execPromise(`echo ${JSON.stringify(_text)} | open_jtalk -x ${dic} -m ${model} -r ${speed} -fm ${tone} -jf ${intonation} -g ${volume} -ow ${filePath}`);
            return filePath;
        });

    const voicePaths = (await Promise.all(promises)).filter((n) => n) as string[];

    const blankPath = path.join(`${filepath}_blank_${between}.wav`);

    if (between !== 0) {
        await execPromise(`ffmpeg -f lavfi -i anullsrc=r=48000:cl=mono -t ${between} ${blankPath}`);

        const voice = voicePaths.map((filePath) => [filePath, blankPath]).flat();
        const mergedFilePath = path.join(`${filepath}.wav`);
        await execPromise(`ffmpeg -y ${voice.map((path) => `-i ${path}`).join(" ")} -filter_complex "concat=n=${voice.length}:v=0:a=1" ${mergedFilePath}`);
        await unlinkPromise(blankPath);
    } else {
        const mergedFilePath = path.join(`${filepath}.wav`);
        await execPromise(`ffmpeg -y ${voicePaths.map((path) => `-i ${path}`).join(" ")} -filter_complex "concat=n=${voicePaths.length}:v=0:a=1" ${mergedFilePath}`);
    }

    await Promise.all(voicePaths.map((path) => unlinkPromise(path)));

    return `${filepath}.wav`;
}

function execPromise(command: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        childProcess.exec(command, (error) => {
            if (error) return reject(error);
            resolve();
        });
    });
}

function unlinkPromise(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) return Promise.resolve();
    return fs.promises.unlink(filePath).catch(console.error);
}


export default generateVoice;