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

    async addXp(quantity: number) {
        await Database.addValueToMember(this, { xp: quantity });
        console.log(`${quantity} xp added to ${this.guildMember.displayName} in ${this.server.name}`);
    }
}
