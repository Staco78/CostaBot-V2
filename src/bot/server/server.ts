import Discord from "discord.js";
import fs from "fs";
import Bot from "../bot";
import ServerCommand from "../commands/serverCommand";
import { join as pathJoin } from "path";
import MembersManager from "../members/membersManager";
import XpManager from "../xp/xpManager";
import Utils from "../../utils";

const serversPath = pathJoin(process.cwd(), "servers");

export default class Server {
    private _id: bigint;
    readonly bot: Bot;
    readonly guild: Discord.Guild;
    private commands: ServerCommand[] = [];
    readonly members: MembersManager;
    private xpManager!: XpManager;
    config!: ServerConfig;
    name: string;

    constructor(bot: Bot, id: bigint) {
        this._id = id;
        this.bot = bot;

        const guild = this.bot.client.guilds.cache.get(`${id}`);
        if (!guild) throw new Error("Guild not found");
        this.guild = guild;
        this.name = guild.name;

        this.members = new MembersManager(this);

        this.loadConfig();
        this.checkConfig().then(() => {
            this.loadCommands();

            this.xpManager = new XpManager(this.bot, this);

            this.bot.client.on("interactionCreate", interaction => {
                if (interaction.isCommand()) {
                    let command = this.commands.find(c => c.command?.id === interaction.commandId);
                    if (command) command.onUsed(this, interaction).catch((reason: Error) => interaction.reply({ content: reason.toString() }));
                }
            });
        });
    }

    get id() {
        return this._id;
    }

    private loadConfig(): void {
        let config = JSON.parse(fs.readFileSync(`${serversPath}/${this.id}/config.json`).toString());

        let globalConfig = this.bot.config;

        let config2 = JSON.parse(JSON.stringify(globalConfig));

        Utils.mergeObjects(config2, config);

        this.config = config2;
    }

    private loadCommands() {
        let commands: ServerCommandsConfig = JSON.parse(fs.readFileSync(`${serversPath}/${this.id}/commands.json`).toString());

        commands.forEach(command => {
            this.commands.push(new ServerCommand(this, command));
        });

        let globalCommands: ServerCommandsConfig = JSON.parse(fs.readFileSync(`${serversPath}/all/commands.json`).toString());

        globalCommands.forEach(command => {
            this.commands.push(new ServerCommand(this, command));
        });
    }

    private async checkConfig() {
        if (!this.config.xp) throw new Error("Server config: missing xp");

        if (!this.config.xp.text) throw new Error("Server config: missing xp.text");
        if (!this.config.xp.text.min) throw new Error("Server config: missing xp.text.min");
        if (!this.config.xp.text.max) throw new Error("Server config: missing xp.text.max");
        if (!this.config.xp.text.cooldown) throw new Error("Server config: missing xp.text.cooldown");

        if (!this.config.xp.voc) throw new Error("Server config: missing xp.voc");
        if (!this.config.xp.voc.min) throw new Error("Server config: missing xp.voc.min");
        if (!this.config.xp.voc.max) throw new Error("Server config: missing xp.voc.max");
        if (!this.config.xp.voc.timer) throw new Error("Server config: missing xp.voc.timer");

        if (!this.config.xp.lvlPassedChannel) throw new Error("Server config: missing xp.lvlPassedChannel");

        const channel = this.guild.channels.cache.get(this.config.xp.lvlPassedChannel);

        if (!channel) throw new Error("Server config: xp level channel not found");

        if (!channel.isText()) throw new Error("Server config: xp level channel is not text channel");
    }
}
