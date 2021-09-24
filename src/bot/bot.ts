import Discord from "discord.js";
import Server from "./server/server";
import fs from "fs";
import { join as pathJoin } from "path";
import { Database } from "../data/database";

export default class Bot {
    readonly servers: Server[] = [];

    readonly client: Discord.Client<true>;

    readonly config: ServerConfig;

    constructor(token: string, onReady: () => void) {
        this.client = new Discord.Client({
            intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "DIRECT_MESSAGE_REACTIONS", "GUILD_VOICE_STATES"],
        });

        this.client.login(token);

        this.config = JSON.parse(fs.readFileSync(pathJoin(process.cwd(), "servers/all/config.json")).toString());

        this.client.on("ready", async client => {
            // this.deleteAllCommands();

            fs.readdirSync(pathJoin(process.cwd(), "servers")).forEach(dir => {
                if (dir === "all") return;
                let id: bigint;
                try {
                    id = BigInt(dir);
                } catch (e) {
                    throw new Error("Wrong server id: " + dir);
                }
                this.servers.push(new Server(this, id));
            });

            console.log("Bot ready");
            onReady();

            const setActivity = () => {
                let version = process.env.npm_package_version ?? "2";
                this.client.user.setActivity(`CostaBot V${version} (DM si bug)`);
            };

            setActivity();

            setInterval(() => {
                setActivity();
            }, 1000 * 60 * 10); // 10 min

            client.on("guildMemberRemove", member => {
                Database.deleteMember(member.guild.id, member.id);
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
