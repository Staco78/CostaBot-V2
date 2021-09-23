type ApplicationCommandData = import("discord.js").ApplicationCommandData;
type DiscordInteractionReplyOptions = import("discord.js").InteractionReplyOptions;

interface InteractionReplyOptions extends DiscordInteractionReplyOptions {
    name?: string;
    type: number;
}

declare const enum InteractionReplyType {
    static,
    interpreted,
    personalized,
}

interface ServerConfig {
    xp: {
        text: {
            min: number;
            max: number;
            cooldown: number;
        };
        voc: {
            min: number;
            max: number;
            timer: number;
        };
        lvlPassedChannel: string;
    };
    radio: {
        defaultLink: string;
    };
}

interface ServerCommandsConfig extends Array<CommandConfig> {}

interface CommandConfig {
    command: ApplicationCommandData;
    reply: InteractionReplyOptions;
}

interface DatabaseMember {
    id: string;
    xp: number;
    server: string;
    lastMessageTimestamp: number;
}

interface ImageGenerationShowXpData {
    PPUrl: string;
    username: string;
    discriminator: string;
    xp: number;
    nextLvlXp: number;
    lvlPassRatio: number;
    level: number;
    rank: number;
}

interface ImageGenerationLvlPassedData {
    username: string;
    discriminator: string;
}

interface ServerRanking {
    users: ServerRankingUser[];
}

interface ServerRankingUser {
    id: string;
    username: string;
    avatarURL: string;
    discriminator: string;
    xp: number;
    lvl: number;
}

interface privateConfig {
    bot: {
        token: string;
    };
    database: {
        url: string;
    };
    discord: {
        client_id: string;
        client_secret: string;
    };
    server: {
        active: boolean;
        port: number;
        publicFiles: string;
    };
    googleApiKey: string;
    websiteUrl: string;
}
