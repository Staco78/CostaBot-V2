import Server from "../server/server";
import Member from "./member";

export default class MembersManager {
    private server: Server;
    private members: Member[] = [];

    constructor(server: Server) {
        this.server = server;
        server.guild.members.fetch().then(members => {
            this.members = members.array().map(m => new Member(m, server));
        });
    }

    async get(id: `${bigint}`) {
        let member = this.members.find(m => m.id === id);
        if (member) return member;

        member = new Member(await this.server.guild.members.fetch(id), this.server);

        this.members.push(member);
        return member;
    }

    async update() {
        const members = await this.server.guild.members.fetch();
        this.members = members.array().map(m => new Member(m, this.server));
    }

    get array() {
        return this.members;
    }
}
