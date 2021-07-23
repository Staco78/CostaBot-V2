import { Message } from "discord.js";
import Bot from "../bot";
import Server from "../server/server";

export default class XpManager {
    private bot: Bot;
    private server: Server;

    constructor(bot: Bot, server: Server) {
        this.bot = bot;
        this.server = server;

        this.bot.client.on("messageCreate", message => {
            if (message.guild?.id.toString() === this.server.id.toString()) this.addXp(message, 12);
        });
    }

    private addXp(message: Message, quantity: number) {
        if (message.member) if (this.canReceiveXp(message)) this.server.members.get(message.member.id).addXp(quantity);
    }

    private canReceiveXp(message: Message): boolean {
        return true;
    }
}
