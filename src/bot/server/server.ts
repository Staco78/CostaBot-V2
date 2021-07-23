import Discord from "discord.js";
import fs from "fs";
import Bot from "../bot";
import ServerCommand from "./serverCommand";
import { join as pathJoin } from "path";

const serversPath = pathJoin(__dirname, "../../../servers");

export default class Server {
    private _id: bigint;
    readonly bot: Bot;
    readonly guild: Discord.Guild;
    private commands: ServerCommand[] = [];

    constructor(bot: Bot, id: bigint) {
        this._id = id;
        this.bot = bot;
        const guild = this.bot.client.guilds.cache.get(`${id}`);
        if (!guild) throw new Error("Guild not found");
        this.guild = guild;

        this.loadConfig();
    }

    get id() {
        return this._id;
    }

    private loadConfig() {
        let config: ServerConfig = JSON.parse(fs.readFileSync(serversPath + "/costa rica/config.json").toString());

        config.commands.forEach(command => {
            this.commands.push(new ServerCommand(this, command));
        });
    }
}
