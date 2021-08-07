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
        switch (this.replyData.type) {
            case InteractionReplyType.static:
                interaction.reply(this.replyData);
                break;

            case InteractionReplyType.interpreted:
                this.interpretInteractionReply(interaction);
                break;

            case InteractionReplyType.personalized:
                this.execPersonalizedCommand(this.replyData.name as string, server, interaction);
                break;
            default:
                throw new Error("Unkown interaction reply type");
        }
    }

    private async execPersonalizedCommand(name: string, server: Server, interaction: Discord.CommandInteraction) {
        let command = await import(`../personalized_commands/${name}`);

        command.exec(this.bot, server, interaction);
    }

    private async interpretInteractionReply(interaction: Discord.CommandInteraction) {
        if (!this.replyData.content) throw new Error("Content to reply not found");

        (this.replyData.content.match(/\${[^}]*}/gm) ?? []).forEach(str => new Interpreter(str.slice(2, -1)).exec());
    }
}
