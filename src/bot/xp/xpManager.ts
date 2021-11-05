import { GuildMember, Message } from "discord.js";
import { Database } from "../../data/database";
import Utils from "../../utils";
import Bot from "../bot";
import Member from "../members/member";
import Server from "../server/server";

export default class XpManager {
    private bot: Bot;
    private server: Server;

    constructor(bot: Bot, server: Server) {
        this.bot = bot;
        this.server = server;

        if (this.server.config.xp.text.active) {
            this.bot.client.on("messageCreate", message => {
                if (message.guild?.id.toString() === this.server.id.toString()) this.addXp(message);
            });
        }

        if (this.server.config.xp.voc.active) {
            setInterval(() => {
                this.xpVoc();
            }, this.server.config.xp.voc.timer);
        }

        console.log(
            `XpManager for server ${server.name} loaded` +
                (this.server.config.xp.voc.active && this.server.config.xp.text.active
                    ? ""
                    : this.server.config.xp.voc
                    ? " (text)"
                    : " (voc)")
        );
    }

    private async addXp(message: Message) {
        if (message.member) {
            const member = await this.server.members.get(message.member.id as `${bigint}`);
            if (await this.canReceiveXp(member)) {
                const quantity = Utils.random(this.server.config.xp.text.min, this.server.config.xp.text.max);

                await member.addXp(quantity);
                await member.updateMessageCooldown();
            }
        }
    }

    private async canReceiveXp(member: Member): Promise<boolean> {
        const databaseMember = await Database.getMember(member);

        return Date.now() - databaseMember.lastMessageTimestamp >= this.server.config.xp.text.cooldown;
    }

    private xpVoc() {
        this.server.members.array.forEach(member => {
            if (XpManager.canGetVocXp(member.guildMember))
                member.addXp(Utils.random(this.server.config.xp.voc.min, this.server.config.xp.voc.max));
        });
    }

    private static canGetVocXp(member: GuildMember): boolean {
        if (!member.voice.channel) return false;
        if (member.voice.channel.members.size < 2) return false;

        if (member.user.bot) return false;
        if (member.voice.mute || member.voice.deaf) return false;

        let otherTrueUser = false;
        for (const m of member.voice.channel.members.values()) {
            if (m.id !== member.id) {
                if (!m.user.bot) {
                    if (!m.voice.mute && !m.voice.deaf) otherTrueUser = true;
                }
            }
        }

        if (!otherTrueUser) return false;

        return true;
    }
}
