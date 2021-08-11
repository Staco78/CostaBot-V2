import { Guild, GuildMember } from "discord.js";
import { Database } from "../../data/database";
import Server from "../server/server";
import calcLvl from "../xp/lvlCalc";

export default class Member {
    readonly guildMember: GuildMember;
    readonly guild: Guild;
    private readonly server: Server;

    constructor(guildMember: GuildMember, server: Server) {
        this.guildMember = guildMember;
        this.guild = this.guildMember.guild;
        this.server = server;
    }

    get id() {
        return this.guildMember.id;
    }

    async getXp() {
        return (await Database.getMember(this)).xp;
    }

    async addXp(quantity: number) {
        const prevXp = await this.getXp();

        await Database.addValueToMember(this, { xp: quantity });

        const prevLvl = calcLvl(prevXp);
        const newLvl = calcLvl(prevXp + quantity);

        if (prevLvl !== newLvl) this.passLvl(newLvl);

        console.log(`${quantity} xp added to ${this.guildMember.displayName} in ${this.server.name}`);
    }

    async getRank() {
        await this.server.members.update();
        let sortedArray = await Database.getServerMembers(this.server);

        return sortedArray.findIndex(m => m.id === this.id) + 1;
    }

    async updateMessageCooldown() {
        await Database.setValueToMember(this, { lastMessageTimestamp: Date.now() });
    }

    private async passLvl(newLevel: number) {
        const channel = this.guild.channels.cache.get(this.server.config.xp.lvlPassedChannel);

        if (!channel) throw new Error("Channel not found");

        if (!channel.isText()) throw new Error("Channel must be a text channel");

        channel.send(`GG ${this.guildMember.toString()} you passed to level ${newLevel}`);
    }
}
