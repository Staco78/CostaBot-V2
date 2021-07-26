import { Guild, GuildMember } from "discord.js";
import { Database } from "../../data/database";
import Server from "../server/server";

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
        await Database.addValueToMember(this, { xp: quantity });
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
}
