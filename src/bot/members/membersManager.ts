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

    get(id: `${bigint}`) {
        const member = this.members.find(m => m.id === id);
        if (member) return member;

        throw new Error("member not found");
    }
}
