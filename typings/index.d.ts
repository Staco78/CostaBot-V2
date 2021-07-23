type ApplicationCommandData = import("discord.js").ApplicationCommandData;
type InteractionReplyOptions = import("discord.js").InteractionReplyOptions;

interface ServerConfig {
    commands: CommandConfig[];
}

interface CommandConfig {
    command: ApplicationCommandData;
    reply: InteractionReplyOptions;
}

interface DatabaseMember {
    id: string;
    xp: number;
    name: string;
}
