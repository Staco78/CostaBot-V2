import Bot from "../bot";
import Server from "../server/server";
import Discord, { GuildMember } from "discord.js";
import { createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnection } from "@discordjs/voice";
import ytdl from "ytdl-core";

export async function exec(bot: Bot, server: Server, interaction: Discord.CommandInteraction) {
    await interaction.deferReply();

    let voiceChannel = (interaction.member as GuildMember).voice.channel ?? undefined;
    if (voiceChannel instanceof Discord.StageChannel) {
        voiceChannel = undefined;
        interaction.channel?.send("Impossible de se connecter au salon vocal: type de channel non supporté");
    }

    new MusicPlayer(server, interaction, voiceChannel, interaction.options.data[0]?.value as string);
}

class MusicPlayer {
    private readonly interaction: Discord.CommandInteraction;
    private readonly server: Server;
    private connection: VoiceConnection | null = null;
    private player = createAudioPlayer();

    private playlist: Music[] = [];
    private actualMusic: Music | null = null;

    constructor(server: Server, interaction: Discord.CommandInteraction, voiceChannel?: Discord.VoiceChannel, link?: string) {
        this.interaction = interaction;
        this.server = server;

        (async () => {
            if (voiceChannel) {
                this.connect(voiceChannel);
                if (link) {
                    await this.addMusic(link);
                    await this.play();
                }
                this.sendEmbed();
            } else {
                if (link) {
                    await this.addMusic(link);
                }
                this.sendEmbed();
            }
        })();
    }

    private connect(voiceChannel: Discord.VoiceChannel) {
        this.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: this.server.guild.id,
            adapterCreator: this.server.guild.voiceAdapterCreator,
        });

        this.connection.on("stateChange", (oldState, newState) => {
            if (newState.status === "disconnected") this.destroy();
        });

        this.connection.subscribe(this.player);
    }

    private destroy() {
        this.player.stop(true);
        if (this.connection?.state.status !== "destroyed") this.connection?.destroy(true);
        this.playlist = [];
        this.interaction.editReply({ content: "Musique terminée", embeds: [] });
    }

    private async addMusic(link: string) {
        this.playlist.push(await Music.create(link));
    }

    private async play() {
        if (!this.connection) throw new Error("Cannot play before connect");

        const music = this.playlist.shift();

        if (!music) throw new Error("Aucune musique a lancer");

        this.actualMusic = music;

        const stream = ytdl.downloadFromInfo(this.actualMusic.infos);

        this.player.play(createAudioResource(stream));
    }

    private generateEmbed(): Discord.MessageEmbed {
        const message = new Discord.MessageEmbed();

        message.setColor("RED");
        message.setTitle(this.actualMusic ? "Lecture en cours" : "Aucune musique en lecture");

        if (this.actualMusic) {
            message.setDescription(`[${this.actualMusic.title}](${this.actualMusic.url})`);
            message.setThumbnail(this.actualMusic.thumbnail);

            message.addField("De:", `[${this.actualMusic.author.name}](${this.actualMusic.author.channel_url})`);
            // message.setAuthor(this.actualMusic.author.name, this.actualMusic.author.thumbnails[0].url);

            message.setFooter(`\nDurée: ${Math.floor(this.actualMusic.length / 60)}:${this.actualMusic.length % 60}\nPLaylist: 1/${this.playlist.length + 1}`);
        }

        return message;
    }

    private async sendEmbed() {
        await this.interaction.editReply({ embeds: [this.generateEmbed()] });
    }
}

type MusicData = { infos: ytdl.videoInfo; url: string; title: string; author: ytdl.Author; length: number; thumbnail: string };

class Music {
    readonly infos: ytdl.videoInfo;
    readonly url: string;
    readonly title: string;
    readonly author: ytdl.Author;
    readonly length: number;
    readonly thumbnail: string;

    constructor(data: MusicData) {
        this.infos = data.infos;
        this.url = data.url;
        this.title = data.title;
        this.author = data.author;
        this.length = data.length;
        this.thumbnail = data.thumbnail;
    }

    static async create(url: string) {
        const infos = await ytdl.getInfo(url);

        const data: MusicData = {
            infos,
            url,
            title: infos.videoDetails.title,
            author: infos.videoDetails.author,
            length: parseInt(infos.videoDetails.lengthSeconds),
            thumbnail: `http://img.youtube.com/vi/${infos.videoDetails.videoId}/0.jpg`,
        };

        return new Music(data);
    }
}
