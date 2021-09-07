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
    await interaction.deferReply();

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
                    this.playlist = await Utils.parseLink(link, () => {
                        this.message.channel.send("Une musique indisponible a été ignorée");
                    });
                    this.next();
                    await this.play();
                }
            } else {
                if (link) {
                    this.playlist = await Utils.parseLink(link, () => {
                        this.message.channel.send("Une musique indisponible a été ignorée");
                    });
                }
            }
            await this.sendEmbed();
            await this.sendButtons();
        })().catch(reject);
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
                    if (this.connection?.state.status === "disconnected") this.destroy();
                }, 1000);
            }
        });

        // this.player.on("error", console.log);
        // this.player.on("debug", console.log);
        // this.player.on("stateChange", console.log);

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

    async addMusic(link: string): Promise<string> {
        const musics: Music[] = await Utils.parseLink(link, () => {
            this.message.channel.send("Une musique indisponible a été ignorée");
        });
        this.playlist.push(...musics);

        if (!this.actualMusic) {
            this.next();
            this.play();
        } else this.sendEmbed();

        if (musics.length === 0) return `Aucune musique n'a été ajouté`;
        if (musics.length === 1) return `Une musique a été ajouté`;
        return `${musics.length} musique ont été ajoutés`;
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
            interaction.deferUpdate().catch(console.log);

            try {
                await (this as any)[interaction.customId.replace("music", "button")](interaction);
            } catch (error) {
                this.reject(error as string);
            }
        });
    }

    private async button_previous() {
        await this.previous();
        await this.play();
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

namespace Utils {
    export async function parseLink(link: string, onIgnored: () => void): Promise<Music[]> {
        // https://www.youtube.com/watch?v=OqeuWoIWCvM
        // https://youtu.be/OqeuWoIWCvM
        // https://www.youtube.com/playlist?list=PLD7SPvDoEddadenVZYBvq0uqSN1RRmFol
        // https://www.youtube.com/watch?v=mUTsvbridvM&list=PLD7SPvDoEddadenVZYBvq0uqSN1RRmFol

        const url = new URL(link);

        if (url.host === "www.youtube.com" || url.host === "music.youtube.com") {
            if (url.pathname === "/watch") {
                const playlistId = url.searchParams.get("list");
                if (playlistId) {
                    return await getPlaylist(playlistId, onIgnored);
                } else {
                    try {
                        return [await Music.create(link)];
                    } catch (error) {
                        onIgnored();
                        return [];
                    }
                }
            } else if (url.pathname === "/playlist") {
                const id = url.searchParams.get("list");
                if (!id) throw new Error("Invalid link");
                return await getPlaylist(id, onIgnored);
            } else throw new Error("Invalid link");
        } else if (url.host === "youtu.be") {
            try {
                return [
                    await Music.create(`https://youtube.com/watch?v=${url.pathname.slice(1, url.pathname.length)}`),
                ];
            } catch (error) {
                onIgnored();
                return [];
            }
        } else throw new Error("Invalid link");
    }

    async function getPlaylist(id: string, onIgnored: () => void): Promise<Music[]> {
        const musics: Music[] = [];
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=50&key=${config.googleApiKey}`
        );

        let json = await response.json();

        // return await parsePlaylistResult(json);

        while (1) {
            musics.push(...(await parsePlaylistResult(json, onIgnored)));

            if (!json.nextPageToken) break;

            json = await getPlaylistPage(id, json.nextPageToken);
        }

        return musics;
    }

    async function getPlaylistPage(id: string, pageToken: string) {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=50&pageToken=${pageToken}&key=${config.googleApiKey}`
        );

        const json = await response.json();

        return json;
    }

    function parsePlaylistResult(json: any, onIgnored: () => void): Promise<Music[]> {
        return new Promise(resolve => {
            const musics: Music[] = [];
            let ignored = 0;

            for (const item of json.items) {
                const url = `https://youtube.com/watch?v=${item.snippet.resourceId.videoId}`;
                Music.create(url)
                    .then(music => {
                        musics.push(music);
                        if (musics.length + ignored === json.items.length) resolve(musics);
                    })
                    .catch(err => {
                        onIgnored();
                        ignored++;
                        if (musics.length + ignored === json.items.length) resolve(musics);
                    });
            }
        });
    }
}
