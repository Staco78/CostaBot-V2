import Discord from "discord.js";
import Server from "./server/server";
import XpManager from "./Xp/xpManager";
import GlobalCommand from "./commands/globalCommand";
import fs from "fs";
import { join as pathJoin } from "path";

import calcLvl from "./Xp/lvlCalc";

export default class Bot {
    readonly client: Discord.Client<true>;

    private commands: GlobalCommand[] = [];
    readonly config: ServerConfig;

    constructor(token: string) {
        this.client = new Discord.Client({
            intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "DIRECT_MESSAGE_REACTIONS"],
        });
        this.client.login(token);

        this.config = JSON.parse(fs.readFileSync(pathJoin(process.cwd(), "servers/all/config.json")).toString());

        this.client.on("ready", async client => {
            console.log("Bot ready");

            new XpManager(this, new Server(this, 664438592093028374n));
            new XpManager(this, new Server(this, 868165566442143784n));
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
