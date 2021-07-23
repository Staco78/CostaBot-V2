import Server from "./server";

import Discord from "discord.js";

export default class ServerCommand {
    command?: Discord.ApplicationCommand;
    private replyData: InteractionReplyOptions;
    constructor(server: Server, data: CommandConfig) {
        this.replyData = data.reply;

        server.guild.commands.create(data.command).then(command => {
            this.command = command;
        });
    }

    onUsed(interaction: Discord.CommandInteraction) {
        interaction.reply(this.replyData);
    }
}
