import { createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnection } from "@discordjs/voice";
import Discord from "discord.js";

import Bot from "../bot";
import Server from "../server/server";

export function exec(bot: Bot, server: Server, interaction: Discord.CommandInteraction) {
    if (server.musicPlayer) throw new Error("Impossible de lancer la radio car la musique est déjà lancée");

    let voiceChannel = (interaction.member as Discord.GuildMember).voice.channel ?? undefined;
    if (voiceChannel instanceof Discord.StageChannel) {
        voiceChannel = undefined;
        interaction.channel?.send("Impossible de se connecter au salon vocal: type de channel non supporté");
    }
    if (!voiceChannel) throw new Error("Impossible de se connecter: pas dans un salon vocal");

    server.radioPlayer = new RadioPlayer(
        server,
        voiceChannel,
        interaction.options.data[0]?.value?.toString() ?? server.config.radio.defaultLink
    );

    interaction.reply("Radio lancée");
}

export class RadioPlayer {
    private connection!: VoiceConnection;
    private server: Server;
    private player = createAudioPlayer();

    constructor(server: Server, voiceChannel: Discord.VoiceChannel, link: string) {
        this.server = server;

        this.connect(voiceChannel);
        this.player.play(createAudioResource(link));
    }

    private connect(voiceChannel: Discord.VoiceChannel): void {
        this.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: this.server.guild.id,
            adapterCreator: this.server.guild.voiceAdapterCreator,
        });

        this.connection.on("stateChange", (oldState, newState) => {
            if (newState.status === "disconnected") {
                setTimeout(() => {
                    if (this.connection.state.status === "disconnected") this.stop();
                }, 1000);
            }
        });

        this.connection.subscribe(this.player);
    }

    stop() {
        this.connection.destroy();
    }
}
