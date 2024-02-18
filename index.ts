/* VoiceJP Main Script */
import { REST, Routes, Client, IntentsBitField, SlashCommandBuilder, Colors, ActivityType, PermissionFlagsBits, SlashCommandSubcommandBuilder, SlashCommandStringOption } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.TOKEN as string;
const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.GuildVoiceStates] });
const restClient = new REST({ version: "10" }).setToken(token);

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
    if (interaction.commandName === "ping") {
        await interaction.reply({
            content: "Pong!",
            embeds: [{
                title: "Pong!",
                description: `Latency is ${Date.now() - interaction.createdTimestamp}ms.\nAPI Latency is ${Math.round(client.ws.ping)}ms.`,
                color: Colors.LuminousVividPink
            }]
        });
    }
});

client.login(token);
