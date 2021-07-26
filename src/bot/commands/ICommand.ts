import Discord from "discord.js";

import Bot from "../bot";
import Server from "../server/server";
import ServerCommand from "./serverCommand";

export default abstract class ICommand {
    command?: Discord.ApplicationCommand;
    protected bot: Bot;
    private replyData: InteractionReplyOptions;

    constructor(bot: Bot, data: CommandConfig) {
        this.bot = bot;
        this.replyData = data.reply;
    }

    onUsed(server: Server, interaction: Discord.CommandInteraction) {
        if (this.replyData.personalized) {
            if (!this.replyData.name) throw Error("Personalized commands require a name");

            this.execPersonalizedCommand(this.replyData.name, server, interaction);
        } else interaction.reply(this.replyData);
    }

    private async execPersonalizedCommand(name: string, server: Server, interaction: Discord.CommandInteraction) {
        let command = await import(`../personalized_commands/${name}.js`);

        command.exec(this.bot, server, interaction);
    }
}