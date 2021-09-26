import Server from "../server/server";
import Member from "./member";

export default class MembersManager {
    private server: Server;
    private members: Member[] = [];

    constructor(server: Server) {
        this.server = server;
        server.guild.members.fetch().then(members => {
            this.members = members.map(m => new Member(m, server));
        });
    }

    async get(id: `${bigint}` | string) {
        let member = this.members.find(m => m.id === id);
        if (member) return member;

        try {
            var m = await this.server.guild.members.fetch(id);
        } catch (e) {
            throw new Error("Member not found");
        }
        member = new Member(m, this.server);

        this.members.push(member);
        return member;
    }

    async update() {
        const members = await this.server.guild.members.fetch();
        this.members = members.map(m => new Member(m, this.server));
    }

    get array() {
        return this.members;
    }
}
