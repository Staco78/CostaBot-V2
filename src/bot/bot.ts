import Discord from "discord.js";
import Server from "./server/server";
import GlobalCommand from "./commands/globalCommand";
import fs from "fs";
import { join as pathJoin } from "path";
import Interpreter from "./commands/interpreter/interpreter";

export default class Bot {
    readonly client: Discord.Client<true>;

    private commands: GlobalCommand[] = [];
    readonly config: ServerConfig;

    constructor(token: string) {
        this.client = new Discord.Client({
            intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "DIRECT_MESSAGE_REACTIONS"],
        });
        // this.client.login(token);

        this.config = JSON.parse(fs.readFileSync(pathJoin(process.cwd(), "servers/all/config.json")).toString());

        new Interpreter("json('{\"x\": 3}')").exec();

        this.client.on("ready", async client => {
            console.log("Bot ready");

            fs.readdirSync(pathJoin(process.cwd(), "servers")).forEach(dir => {
                if (dir === "all") return;
                let id: bigint;
                try {
                    id = BigInt(dir);
                } catch (e) {
                    throw new Error("Wrong server id: " + dir);
                }
                new Server(this, id);
            });
        });
    }

    private deleteAllCommands() {
        this.client.application.commands.fetch().then(commands => {
            commands.forEach(c => c.delete());
        });

        this.client.guilds.fetch().then(guilds => {
            this.client.guilds.cache.forEach(guild => {
                guild.commands.fetch().then(commands => {
                    commands.forEach(c => c.delete());
                });
            });
        });
    }
}
