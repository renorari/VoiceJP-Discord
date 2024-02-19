/* VoiceJP Main Script */
import fs from "node:fs";
import path from "node:path";
import { AudioPlayer, StreamType, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } from "@discordjs/voice";
import { REST, Routes, Client, IntentsBitField, SlashCommandBuilder, Colors, ActivityType, PermissionFlagsBits, SlashCommandSubcommandBuilder, SlashCommandStringOption, SlashCommandChannelOption, ChannelType, Message, ChatInputCommandInteraction, BaseGuildVoiceChannel, VoiceChannel, GuildBasedChannel, Collection, GuildMember } from "discord.js";
import dotenv from "dotenv";
import { generateVoice } from "./speech";
dotenv.config();

if (!fs.existsSync(path.join(__dirname, "temp"))) {
    fs.mkdirSync(path.join(__dirname, "temp"));
} else {
    fs.readdirSync(path.join(__dirname, "temp")).forEach((file) => {
        fs.unlinkSync(path.join(__dirname, "temp", file));
    });
}

const voiceModels = JSON.parse(fs.readFileSync(path.join(__dirname, "voice_models/models.json"), "utf-8"));
const token = process.env.TOKEN as string;
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.MessageContent
    ]
});
const restClient = new REST({ version: "10" }).setToken(token);

const voiceChannels = new Map();

function setActivity() {
    client.user?.setActivity({
        "name": `/help | ${client.guilds.cache.size}servers | ${client.users.cache.size}users | ${client.ws.ping}ms`,
        "type": ActivityType.Custom
    });
}

client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    try {
        await restClient.put(Routes.applicationCommands(client.application?.id as string), {
            body: [
                new SlashCommandBuilder()
                    .setName("ping")
                    .setDescription("Replies with Pong!")
                    .setDescriptionLocalization("ja", "Pong! と返信します。"),
                new SlashCommandBuilder()
                    .setName("join")
                    .setDescription("Joins the voice channel.")
                    .setDescriptionLocalization("ja", "ボイスチャンネルに参加します。")
                    .addChannelOption(
                        new SlashCommandChannelOption()
                            .setName("channel")
                            .setDescription("The channel to join.")
                            .setDescriptionLocalization("ja", "参加するチャンネル。")
                            .addChannelTypes(ChannelType.GuildVoice)
                            .setRequired(true)
                    )
                    .setDMPermission(false)
                    .setDefaultMemberPermissions(PermissionFlagsBits.Connect),
                new SlashCommandBuilder()
                    .setName("leave")
                    .setDescription("Leaves the voice channel.")
                    .setDescriptionLocalization("ja", "ボイスチャンネルから退出します。")
                    .setDMPermission(false)
                    .setDefaultMemberPermissions(PermissionFlagsBits.Connect),
                new SlashCommandBuilder()
                    .setName("speech")
                    .setDescription("set speech functions.")
                    .setDescriptionLocalization("ja", "音声機能を設定します。")
                    .addSubcommand(
                        new SlashCommandSubcommandBuilder()
                            .setName("synthesis")
                            .setDescription("set synthesis.")
                            .setDescriptionLocalization("ja", "音声合成を設定します。")
                            .addStringOption(
                                new SlashCommandStringOption()
                                    .setName("voice-id")
                                    .setDescription("set voice id.")
                                    .setDescriptionLocalization("ja", "音声IDを設定します。")
                                    .setChoices(...voiceModels.map((voiceModel: { id: string; name: string; }) => ({ value: voiceModel.id, name: voiceModel.name })))
                            )
                            .addStringOption(
                                new SlashCommandStringOption()
                                    .setName("speed")
                                    .setDescription("set speed.")
                                    .setDescriptionLocalization("ja", "速度を設定します。")
                            )
                            .addStringOption(
                                new SlashCommandStringOption()
                                    .setName("tone")
                                    .setDescription("set tone.")
                                    .setDescriptionLocalization("ja", "音程を設定します。")
                            )
                            .addStringOption(
                                new SlashCommandStringOption()
                                    .setName("intonation")
                                    .setDescription("set intonation.")
                                    .setDescriptionLocalization("ja", "抑揚を設定します。")
                            )
                            .addStringOption(
                                new SlashCommandStringOption()
                                    .setName("volume")
                                    .setDescription("set volume.")
                                    .setDescriptionLocalization("ja", "音量を設定します。")
                            )
                    )
                    .addSubcommand(
                        new SlashCommandSubcommandBuilder()
                            .setName("recognition")
                            .setDescription("set recognition.")
                            .setDescriptionLocalization("ja", "音声認識を設定します。")
                    )
            ]
        });
    } catch (error) {
        console.error(error);
    }

    setActivity();
    setInterval(setActivity, 1000 * 10);
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;
    if (!interaction.member) {
        await interaction.reply("申し訳ございませんが、DMでは使用できません。");
        return;
    }
    let channel: BaseGuildVoiceChannel | VoiceChannel | GuildBasedChannel | null | undefined;
    let connection: VoiceConnection;
    let player: AudioPlayer;
    let voiceModel: { id: string; file: string; name: string; };
    let onMessageCreate;
    switch (interaction.commandName) {
    case "ping":
        await interaction.reply({
            content: "ポン!",
            embeds: [{
                title: "ポン!",
                description: `レイテンシ: ${client.ws.ping}m秒`,
                color: Colors.LuminousVividPink
            }]
        });
        break;
    case "join":
        channel = await interaction.guild?.channels.fetch(interaction.options.get("channel")?.value as string);
        if (!channel) {
            await interaction.reply({
                "content": "エラーが発生しました。",
                "embeds": [{
                    "title": "エラー",
                    "description": "チャンネルが見つかりません。",
                    "color": Colors.Red
                }],
                "ephemeral": true
            });
            return;
        }
        if (channel.type !== ChannelType.GuildVoice) {
            await interaction.reply({
                "content": "エラーが発生しました。",
                "embeds": [{
                    "title": "エラー",
                    "description": "ボイスチャンネルを指定してください。",
                    "color": Colors.Red
                }],
                "ephemeral": true
            });
            return;
        } else if (!channel.joinable) {
            await interaction.reply({
                "content": "エラーが発生しました。",
                "embeds": [{
                    "title": "エラー",
                    "description": "参加できません。",
                    "color": Colors.Red
                }],
                "ephemeral": true
            });
            return;
        }
        if (voiceChannels.has(interaction.guildId as string)) {
            voiceChannels.get(interaction.guildId as string).connection.destroy();
            voiceChannels.delete(interaction.guildId as string);
        }
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });
        player = createAudioPlayer();
        connection.subscribe(player);
        voiceChannels.set(interaction.guildId as string, { connection, player });
        connection.on(VoiceConnectionStatus.Ready, () => {
            voiceChannels.get(interaction.guildId as string).checker = setInterval(() => {
                if ((channel?.members as Collection<string, GuildMember>).size <= 1) {
                    interaction.channel?.send({
                        "content": "ボイスチャンネルから退出しました。",
                        "embeds": [{
                            "title": "退出",
                            "description": "ボイスチャンネルから退出しました。",
                            "color": Colors.Yellow
                        }]
                    });
                    connection.destroy();
                    clearInterval(voiceChannels.get(interaction.guildId as string).checker);
                    voiceChannels.delete(interaction.guildId as string);
                }
            });
        });
        await interaction.reply({
            "content": "ボイスチャンネルに参加しました。",
            "embeds": [{
                "title": "参加",
                "description": `${channel.name}に参加しました。`,
                "color": Colors.Green
            }]
        });
        break;
    case "leave":
        if (!voiceChannels.has(interaction.guildId as string)) {
            await interaction.reply({
                "content": "エラーが発生しました。",
                "embeds": [{
                    "title": "エラー",
                    "description": "ボイスチャンネルに参加していません。",
                    "color": Colors.Red
                }],
                "ephemeral": true
            });
            return;
        }
        voiceChannels.get(interaction.guildId as string).connection.destroy();
        voiceChannels.delete(interaction.guildId as string);
        await interaction.reply({
            "content": "ボイスチャンネルから退出しました。",
            "embeds": [{
                "title": "退出",
                "description": "ボイスチャンネルから退出しました。",
                "color": Colors.Green
            }]
        });
        break;
    case "speech":
        if (!voiceChannels.has(interaction.guildId as string)) {
            await interaction.reply({
                "content": "エラーが発生しました。",
                "embeds": [{
                    "title": "エラー",
                    "description": "ボイスチャンネルに参加していません。",
                    "color": Colors.Red
                }],
                "ephemeral": true
            });
            return;
        }
        switch ((interaction as ChatInputCommandInteraction).options.getSubcommand()) {
        case "synthesis":
            if (voiceChannels.get(interaction.guildId as string).synthesis) {
                client.off("messageCreate", voiceChannels.get(interaction.guildId as string).synthesis.messageCreate);
                voiceChannels.get(interaction.guildId as string).synthesis = null;
                await interaction.reply({
                    "content": "音声合成を解除しました。",
                    "embeds": [{
                        "title": "音声合成",
                        "description": "音声合成を解除しました。",
                        "color": Colors.Green
                    }]
                });
                return;
            }
            voiceModel = voiceModels.find((voiceModel: { id: string; }) => voiceModel.id === (interaction.options.get("voice-id")?.value ?? "voicea"));
            if (!voiceModel) {
                await interaction.reply({
                    "content": "エラーが発生しました。",
                    "embeds": [{
                        "title": "エラー",
                        "description": "音声IDが見つかりません。",
                        "color": Colors.Red
                    }],
                    "ephemeral": true
                });
                return;
            }
            onMessageCreate = async (message: Message) => {
                if (message.author.bot) return;
                if (message.channel.id !== voiceChannels.get(interaction.guildId as string)?.synthesis?.channel) return;
                if (message.content.length > 100 || message.content == "") return;
                const filePath = path.join(__dirname, "temp", `${message.id}`);
                const generatedVoice = await generateVoice(
                    // eslint-disable-next-line no-useless-escape
                    `${message.member?.displayName ? message.member.displayName : message.author.username}。${message.cleanContent.replace(/https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+/g, "URL省略")}`,
                    filePath,
                    path.join(__dirname, "voice_models", voiceModel.file),
                    voiceChannels.get(interaction.guildId as string).synthesis.speed,
                    voiceChannels.get(interaction.guildId as string).synthesis.tone,
                    voiceChannels.get(interaction.guildId as string).synthesis.intonation,
                    voiceChannels.get(interaction.guildId as string).synthesis.volume,
                    0.25
                ).catch((error) => {
                    console.error(error);
                });
                if (!generatedVoice) return;
                const resource = createAudioResource(generatedVoice, { inputType: StreamType.Arbitrary });
                voiceChannels.get(interaction.guildId as string).player.play(resource);
            };
            voiceChannels.get(interaction.guildId as string).synthesis = {
                "channel": interaction.channel?.id as string,
                "voiceModel": voiceModel,
                "speed": interaction.options.get("speed")?.value as number ?? 1.25,
                "tone": interaction.options.get("tone")?.value as number ?? 1,
                "intonation": interaction.options.get("intonation")?.value as number ?? 1,
                "volume": interaction.options.get("volume")?.value as number ?? -6,
                "messageCreate": onMessageCreate
            };
            client.on("messageCreate", onMessageCreate);
            await interaction.reply({
                "content": "音声合成を設定しました。",
                "embeds": [{
                    "title": "音声合成",
                    "description": `音声: ${voiceModel.name}\n速度: ${voiceChannels.get(interaction.guildId as string).synthesis.speed}\n音程: ${voiceChannels.get(interaction.guildId as string).synthesis.tone}\n抑揚: ${voiceChannels.get(interaction.guildId as string).synthesis.intonation}\n音量: ${voiceChannels.get(interaction.guildId as string).synthesis.volume}`,
                    "color": Colors.Green
                }]
            });
            break;
        }
        break;
    }
});

client.login(token);

process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
});