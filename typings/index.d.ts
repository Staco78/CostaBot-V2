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
    name: string;
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
