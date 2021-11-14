import Bot from "../bot";
import Server from "../server/server";
import Discord from "discord.js";
import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    VoiceConnection,
} from "@discordjs/voice";
import ytdl from "ytdl-core";
import fetch from "node-fetch";
import config from "../../config";

export async function exec(bot: Bot, server: Server, interaction: Discord.CommandInteraction) {
    let voiceChannel = (interaction.member as Discord.GuildMember).voice.channel ?? undefined;
    if (voiceChannel instanceof Discord.StageChannel) {
        voiceChannel = undefined;
        interaction.channel?.send("Impossible de se connecter au salon vocal: type de channel non supporté");
    }

    if (server.radioPlayer) throw new Error("Impossible de lancer la musique car la radio est déjà lancée");

    if (server.musicPlayer) {
        if (interaction.options.data[0].value && typeof interaction.options.data[0].value === "string") {
            server.musicPlayer.addMusic(interaction.options.data[0].value);
            interaction.editReply("Ajouté avec succès");
        }
    } else {
        await interaction.editReply("Je lance la musique");

        server.musicPlayer = new MusicPlayer(
            server,
            interaction,
            reason => {
                interaction.channel?.send(`${reason}`);
            },
            voiceChannel,
            interaction.options.data[0]?.value as string
        );
    }
}

export class MusicPlayer {
    private readonly interaction: Discord.CommandInteraction;
    private readonly server: Server;
    private message!: Discord.Message;
    private connection: VoiceConnection | null = null;
    private player = createAudioPlayer();

    private history: Music[] = [];
    private playlist: Playlist = new EmptyPlaylist();
    private actualMusic: Music | null = null;

    private reject: (reason: string) => void;
    private isDestroyed = false;

    constructor(
        server: Server,
        interaction: Discord.CommandInteraction,
        reject: (reason: string) => void,
        voiceChannel?: Discord.VoiceChannel,
        link?: string
    ) {
        this.interaction = interaction;
        this.server = server;
        this.reject = reject;

        this.player.on("stateChange", async (oldState, newState) => {
            if (
                newState.status === AudioPlayerStatus.Idle &&
                oldState.status !== AudioPlayerStatus.Idle &&
                !this.isDestroyed
            ) {
                await this.next();
                this.play();
            }
        });

        this.player.on("error", error => {
            this.reject("Une erreur inattendue s'est produite");
            console.log(`${error}\nUnexpected music error`);
            this.next();
        });

        (async () => {
            this.message = (await interaction.channel?.send("Chargement...")) as Discord.Message;

            if (voiceChannel) {
                this.connect(voiceChannel);
                if (link) {
                    this.playlist = loadPlaylistFromLink(link);
                    await this.next();
                    await this.play();
                }
            } else {
                if (link) {
                    this.playlist = loadPlaylistFromLink(link);
                }
            }
            await this.sendEmbed();
            await this.sendButtons();
        })().catch(this.reject);
    }

    private connect(voiceChannel: Discord.VoiceChannel): void {
        this.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: this.server.guild.id,
            adapterCreator: this.server.guild.voiceAdapterCreator as any,
        });

        this.connection.on("stateChange", (oldState, newState) => {
            if (newState.status === "disconnected") {
                setTimeout(() => {
                    if (this.connection?.state.status === "disconnected") this.destroy();
                }, 1000);
            }
        });

        this.connection.subscribe(this.player);
    }

    async destroy() {
        this.isDestroyed = true;
        this.player.stop(true);
        this.player.removeAllListeners();
        if (this.connection?.state.status !== "destroyed") this.connection?.destroy(true);
        this.connection?.removeAllListeners();
        await this.message.edit({ content: "Musique terminée", embeds: [], components: [] });
        this.server.musicPlayer = null;
    }

    private async play() {
        if (!this.connection) throw new Error("Cannot play before connect");

        if (!this.actualMusic) return;

        const stream = ytdl.downloadFromInfo(this.actualMusic.infos, {
            filter: "audioonly",
            quality: this.actualMusic.infos.videoDetails.isLiveContent
                ? [128, 127, 120, 96, 95, 94, 93]
                : "highestaudio",
            dlChunkSize: 0,
            highWaterMark: 1 << 25,
        });

        this.player.play(createAudioResource(stream));
    }

    addMusic(link: string): void {
        const playlistToAdd = loadPlaylistFromLink(link);
        this.playlist.push(playlistToAdd);

        if (this.connection) {
            if (!this.actualMusic) {
                this.next().then(async () => {
                    await this.play();
                });
            }
        }
    }

    private async next() {
        if (this.actualMusic) this.history.push(this.actualMusic);

        this.actualMusic = await this.playlist.getNextMusic();

        this.sendEmbed();
    }

    private async previous() {
        const music = this.history.pop();
        if (!music) throw new Error("No music to play");

        if (this.actualMusic) this.playlist.unshift(this.actualMusic);

        this.actualMusic = music;

        this.sendEmbed();
    }

    private async play_pause(interaction?: Discord.ButtonInteraction) {
        if (!this.connection && interaction) {
            const channel = (interaction.member as Discord.GuildMember).voice.channel;

            if (channel instanceof Discord.VoiceChannel) {
                this.connect(channel);
            }
            this.play_pause();
            return;
        }

        if (this.player.state.status === "playing") {
            this.player.pause();
        } else if (this.player.state.status === "paused") {
            this.player.unpause();
        } else {
            if (!this.actualMusic) await this.next();
            await this.play();
        }
    }

    private generateEmbed(): Discord.MessageEmbed {
        const message = new Discord.MessageEmbed();

        message.setColor("RED");
        message.setTitle(this.actualMusic ? "Lecture en cours" : "Aucune musique en lecture");

        if (this.actualMusic) {
            message.setDescription(`[${this.actualMusic.title}](${this.actualMusic.url})`);
            message.setThumbnail(this.actualMusic.thumbnail);

            message.addField("De", `[${this.actualMusic.author.name}](${this.actualMusic.author.channel_url})`, true);
            // message.setAuthor(this.actualMusic.author.name, this.actualMusic.author.thumbnails[0].url);

            message.setFooter(
                `\nDurée: ${Math.floor(this.actualMusic.length / 60)}:${this.actualMusic.length % 60}\nPLaylist: ${
                    this.history.length + 1
                }/${this.playlist.length + this.history.length + 1}`
            );
        }

        return message;
    }

    private async sendEmbed() {
        await this.message.edit({ content: "_ _", embeds: [this.generateEmbed()] });
    }

    private async sendButtons() {
        await this.message.edit({
            components: [
                new Discord.MessageActionRow({
                    components: [
                        new Discord.MessageButton({ customId: "music_previous", style: "SECONDARY", label: "⏮️" }),
                        new Discord.MessageButton({ customId: "music_play_pause", style: "SECONDARY", label: "⏯️" }),
                        new Discord.MessageButton({ customId: "music_stop", style: "SECONDARY", label: "⏹️" }),
                        new Discord.MessageButton({ customId: "music_next", style: "SECONDARY", label: "⏭️" }),
                        new Discord.MessageButton({ customId: "music_connect", style: "SECONDARY", label: "➕" }),
                    ],
                }),
            ],
        });

        this.server.onButtonInteraction("music", async interaction => {
            interaction.deferUpdate().catch(this.reject);

            try {
                await (this as any)[interaction.customId.replace("music", "button")](interaction);
            } catch (error) {
                this.reject(error as string);
            }
        });
    }

    private async button_previous() {
        await this.previous();
        if (this.connection) await this.play();
    }

    private async button_next() {
        await this.next();
        if (this.actualMusic) {
            if (this.connection) await this.play();
        } else this.player.stop();
    }

    private async button_connect(interaction: Discord.ButtonInteraction) {
        const voiceChannel = (interaction.member as Discord.GuildMember).voice.channel;

        if (!voiceChannel) {
            this.interaction.channel?.send("Impossible de se connecter: pas dans un salon vocal");
            return;
        } else if (voiceChannel instanceof Discord.StageChannel) {
            this.interaction.channel?.send("Impossible de se connecter au salon vocal: type de channel non supporté");
            return;
        }

        this.connect(voiceChannel);

        if (!this.actualMusic) {
            await this.next();
            await this.play();
        }
    }

    private async button_stop() {
        await this.destroy();
    }

    private async button_play_pause(interaction: Discord.ButtonInteraction) {
        await this.play_pause(interaction);
    }
}

type MusicData = {
    infos: ytdl.videoInfo;
    url: string;
    title: string;
    author: ytdl.Author;
    length: number;
    thumbnail: string;
};

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

    static async create(id: string) {
        const infos = await ytdl.getInfo(id);

        const data: MusicData = {
            infos,
            url: `https://youtube.com/watch?v=${id}`,
            title: infos.videoDetails.title,
            author: infos.videoDetails.author,
            length: parseInt(infos.videoDetails.lengthSeconds),
            thumbnail: `http://img.youtube.com/vi/${infos.videoDetails.videoId}/0.jpg`,
        };

        return new Music(data);
    }
}

abstract class Playlist {
    protected cache: (Music | Playlist)[] = [];
    abstract getNextMusic(): Promise<Music | null>;
    get length() {
        return this.cache.length;
    }
    unshift(music: Music) {
        this.cache.unshift(music);
    }
    push(playlist: Playlist) {
        this.cache.push(playlist);
    }
}

class RealPlaylist extends Playlist {
    private readonly id: string;
    private nextPageToken: string | null = "";

    constructor(id: string) {
        super();
        this.id = id;
    }

    async getNextMusic(): Promise<Music | null> {
        if (this.cache.length > 0) {
            const shift = this.cache.shift() ?? null;
            if (shift instanceof Playlist) return await shift.getNextMusic();
            else return shift;
        } else if (this.nextPageToken !== null) {
            await this.fetchPlaylist();
            return await this.getNextMusic();
        }

        return null;
    }

    private fetchPlaylist(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (this.nextPageToken) {
                var response = await fetch(
                    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${this.id}&maxResults=10&pageToken=${this.nextPageToken}&key=${config.googleApiKey}`
                );
            } else {
                var response = await fetch(
                    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${this.id}&maxResults=10&key=${config.googleApiKey}`
                );
            }
            const json = await response.json();
            this.nextPageToken = json.nextPageToken ?? null;

            let resolved = false;

            for (const item of json.items) {
                try {
                    const music = await Music.create(item.snippet.resourceId.videoId);
                    this.cache.push(music);
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                } catch (error) {
                    console.error(error);
                    reject(error);
                }
            }
        });
    }
}

class MusicPlaylist extends Playlist {
    private musicId: string | null;

    constructor(musicId: string) {
        super();
        this.musicId = musicId;
    }

    async getNextMusic(): Promise<Music | null> {
        if (this.musicId) {
            const x = this.musicId;
            this.musicId = null;
            return await Music.create(x);
        }
        const shift = this.cache.shift() ?? null;
        if (shift instanceof Playlist) return await shift.getNextMusic();
        else return shift;
    }

    get length() {
        return super.length + (this.musicId ? 1 : 0);
    }
}

class EmptyPlaylist extends Playlist {
    async getNextMusic() {
        const shift = this.cache.shift() ?? null;
        if (shift instanceof Playlist) return await shift.getNextMusic();
        else return shift;
    }
}

function loadPlaylistFromLink(link: string): Playlist {
    const url = new URL(link);

    if (url.host === "www.youtube.com" || url.host === "music.youtube.com") {
        if (url.pathname === "/watch") {
            const playlistId = url.searchParams.get("list") ?? url.searchParams.get("playlist");
            if (playlistId) {
                return new RealPlaylist(playlistId);
            } else {
                const id = url.searchParams.get("v");
                if (!id) throw new Error("Invalid link");
                return new MusicPlaylist(id);
            }
        } else if (url.pathname === "/playlist") {
            const id = url.searchParams.get("list");
            if (!id) throw new Error("Invalid link");
            return new RealPlaylist(id);
        } else throw new Error("Invalid link");
    } else if (url.host === "youtu.be") {
        return new MusicPlaylist(url.pathname.slice(1, url.pathname.length));
    } else throw new Error("Invalid link");
}
