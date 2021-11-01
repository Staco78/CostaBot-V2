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
import { EventEmitter } from "events";

export async function exec(bot: Bot, server: Server, interaction: Discord.CommandInteraction) {
    let voiceChannel = (interaction.member as Discord.GuildMember).voice.channel ?? undefined;
    if (voiceChannel instanceof Discord.StageChannel) {
        voiceChannel = undefined;
        interaction.channel?.send("Impossible de se connecter au salon vocal: type de channel non supporté");
    }

    if (server.radioPlayer) throw new Error("Impossible de lancer la musique car la radio est déjà lancée");

    if (server.musicPlayer) {
        if (interaction.options.data[0].value && typeof interaction.options.data[0].value === "string") {
            const msg = await server.musicPlayer.addMusic(interaction.options.data[0].value);
            interaction.editReply(msg);
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
    private playlist: Music[] = [];
    private actualMusic: Music | null = null;

    private reject: (reason: string) => void;

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

        this.player.on("stateChange", (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                this.next();
                this.play();
            }
        });

        this.player.on("error", error => {
            this.reject("Une erreur inattendue s'est produite\nLa musique se relance");
            console.log(`${error}\nUnexpected error restart music`);

            this.play();
        });

        (async () => {
            this.message = (await interaction.channel?.send("Chargement...")) as Discord.Message;

            if (voiceChannel) {
                this.connect(voiceChannel);
                if (link) {
                    await this._addMusic(link);
                    this.next();

                    await this.play();
                }
            } else {
                if (link) {
                    await this._addMusic(link);
                }
            }
            await this.sendEmbed();
            await this.sendButtons();
        })().catch(this.reject);
    }

    private errorLoadingMusic(details: string) {
        const str = `Une musique indisponible a été ignorée (${details})`;

        this.interaction.channel?.send(str);
    }

    private _addMusic(url: string) {
        return new Promise<void>(resolve => {
            const musicLoader = new MusicLoader(url);
            let resolved = false;
            const listener = (music: Music) => {
                this.playlist.push(music);

                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            };
            musicLoader.on("music_added", listener);

            musicLoader.once("end", () => {
                this.sendEmbed();
                musicLoader.off("music_added", listener);
            });

            musicLoader.on("loading_error", (url: string, error: Error) => {
                this.errorLoadingMusic(error.toString());
            });
        });
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
        this.player.stop(true);
        this.player.removeAllListeners();
        if (this.connection?.state.status !== "destroyed") this.connection?.destroy(true);
        this.connection?.removeAllListeners();
        this.playlist = [];
        await this.message.edit({ content: "Musique terminée", embeds: [], components: [] });
        this.server.musicPlayer = null;
    }

    private async play() {
        if (!this.connection) throw new Error("Cannot play before connect");

        if (!this.actualMusic) return;

        const stream = ytdl.downloadFromInfo(this.actualMusic.infos, {
            filter: "audioonly",
            quality: "highestaudio",
            dlChunkSize: 0,
            highWaterMark: 1 << 25,
        });

        this.player.play(createAudioResource(stream));
    }

    addMusic(link: string): Promise<string> {
        return new Promise<string>(resolve => {
            let played = false;
            const musicLoader = new MusicLoader(link);
            let musicsAddedCount = 0;

            musicLoader.on("music_added", (music: Music) => {
                musicsAddedCount++;
                this.playlist.push(music);
                if (this.connection) {
                    if (!played) {
                        if (!this.actualMusic) {
                            this.next();
                            this.play();
                        }
                    }
                }
            });

            musicLoader.on("end", () => {
                this.sendEmbed();
                if (musicsAddedCount === 0) resolve(`Aucune musique n'a été ajouté`);
                if (musicsAddedCount === 1) resolve(`Une musique a été ajouté`);
                resolve(`${musicsAddedCount} musiques ont été ajoutés`);
            });

            musicLoader.on("loading_error", (url: string, error: Error) => {
                this.errorLoadingMusic(error.toString());
            });
        });
    }

    private next() {
        if (this.actualMusic) this.history.push(this.actualMusic);

        this.actualMusic = this.playlist.shift() ?? null;

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
            if (!this.actualMusic) this.next();
            this.play();
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
        this.next();
        if (this.actualMusic) {
            if (this.connection) this.play();
        } else this.player.stop();
    }

    private button_connect(interaction: Discord.ButtonInteraction) {
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
            this.next();
            this.play();
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

class MusicLoader extends EventEmitter {
    constructor(link: string) {
        super();

        const url = new URL(link);

        if (url.host === "www.youtube.com" || url.host === "music.youtube.com") {
            if (url.pathname === "/watch") {
                const playlistId = url.searchParams.get("list");
                if (playlistId) {
                    this.parsePlaylist(playlistId);
                } else {
                    this.getMusic(link.slice(32));
                }
            } else if (url.pathname === "/playlist") {
                const id = url.searchParams.get("list");
                if (!id) throw new Error("Invalid link");
                this.parsePlaylist(id);
            } else throw new Error("Invalid link");
        } else if (url.host === "youtu.be") {
            this.getMusic(url.pathname.slice(1, url.pathname.length));
        } else throw new Error("Invalid link");
    }

    private async parsePlaylist(playlistId: string): Promise<void> {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${config.googleApiKey}`
        );

        let json = await response.json();

        // return await parsePlaylistResult(json);

        let count = 0;

        while (1) {
            count++;
            this.parsePlaylistResult(json).then(() => {
                count--;

                if (count === 0) this.emit("end");
            });

            if (!json.nextPageToken) break;

            json = await this.getPlaylistPage(playlistId, json.nextPageToken);
        }
    }

    private parsePlaylistResult(json: any): Promise<void> {
        return new Promise(resolve => {
            let musics = 0;

            for (const item of json.items) {
                const url = `https://youtube.com/watch?v=${item.snippet.resourceId.videoId}`;
                Music.create(url)
                    .then(music => {
                        musics++;
                        this.emit("music_added", music);
                        if (musics === json.items.length) resolve();
                    })
                    .catch(err => {
                        musics++;
                        this.emit("loading_error", url, err);
                        if (musics === json.items.length) resolve();
                    });
            }
        });
    }

    private async getPlaylistPage(id: string, pageToken: string) {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=50&pageToken=${pageToken}&key=${config.googleApiKey}`
        );

        const json = await response.json();

        return json;
    }

    private async getMusic(id: string): Promise<void> {
        const url = `https://youtube.com/watch?v=${id}`;
        try {
            this.emit("music_added", await Music.create(url));
        } catch (error) {
            this.emit("loading_error", url, error);
        }

        this.emit("end");
    }
}
