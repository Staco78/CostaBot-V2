import Server from "./server";

export default class ServerCommand {
    constructor(server: Server, data: ApplicationCommandData) {
        server.guild.commands.create(data);
    }
}
