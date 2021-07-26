import Server from "../server/server";

import Discord from "discord.js";
import Bot from "../bot";
import ICommand from "./ICommand";

export default class ServerCommand extends ICommand {
    constructor(server: Server, data: CommandConfig) {
        super(server.bot, data);

        server.guild.commands.create(data.command).then(command => {
            this.command = command;
        });
    }
}
