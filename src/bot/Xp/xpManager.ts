import { Message } from "discord.js";
import { Database } from "../../data/database";
import Bot from "../bot";
import Member from "../members/member";
import Server from "../server/server";

export default class XpManager {
    private bot: Bot;
    private server: Server;

    constructor(bot: Bot, server: Server) {
        this.bot = bot;
        this.server = server;

        // setInterval(() => this.xpVoc(), 6000);

        this.bot.client.on("messageCreate", message => {
            if (message.guild?.id.toString() === this.server.id.toString()) this.addXp(message);
        });
    }

    private async addXp(message: Message) {
        if (message.member) {
            const member = await this.server.members.get(message.member.id);
            if (await this.canReceiveXp(member)) {
                const quantity = Math.round(
                    Math.random() * (this.server.config.xp.text.max - this.server.config.xp.text.min) +
                        this.server.config.xp.text.min
                );

                await member.addXp(quantity);
                await member.updateMessageCooldown();
            }
        }
    }

    private async canReceiveXp(member: Member): Promise<boolean> {
        const databaseMember = await Database.getMember(member);

        return Date.now() - databaseMember.lastMessageTimestamp >= this.server.config.xp.text.cooldown;
    }

    private async xpVoc() {
        this.server.members.array.forEach(member =>
            member.getXp().then(xp => console.log(member.guildMember.displayName, xp))
        );
    }
}
