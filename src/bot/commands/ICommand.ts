import Discord from "discord.js";

import Bot from "../bot";
import Server from "../server/server";
import Interpreter from "./interpreter/interpreter";

export default abstract class ICommand {
    command?: Discord.ApplicationCommand;
    protected bot: Bot;
    private replyData: InteractionReplyOptions;

    constructor(bot: Bot, data: CommandConfig) {
        this.bot = bot;
        this.replyData = data.reply;
    }

    onUsed(server: Server, interaction: Discord.CommandInteraction) {
        return new Promise<void>((resolve, reject) => {
            switch (this.replyData.type) {
                case InteractionReplyType.static:
                    interaction.reply(this.replyData).catch(reject);
                    break;

                case InteractionReplyType.interpreted:
                    this.interpretInteractionReply(interaction).catch(reject);
                    break;

                case InteractionReplyType.personalized:
                    this.execPersonalizedCommand(this.replyData.name as string, server, interaction).catch(reject);
                    break;
                default:
                    throw new Error("Unkown interaction reply type");
            }
        });
    }

    private async execPersonalizedCommand(name: string, server: Server, interaction: Discord.CommandInteraction) {
        let command = await import(`../personalized_commands/${name}`);

        await command.exec(this.bot, server, interaction);
    }

    private async interpretInteractionReply(interaction: Discord.CommandInteraction) {
        if (!this.replyData.content) throw new Error("Content to reply not found");

        const server = this.bot.servers.find(server => server.id.toString() === interaction.guildId);

        if (!server) throw new Error("Server not found");

        interaction.reply(await new Interpreter(this.replyData.content, server, interaction).exec());
    }
}
