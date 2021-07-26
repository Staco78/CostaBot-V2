import Discord from "discord.js";
import fs from "fs";
import Bot from "../bot";
import ServerCommand from "../commands/serverCommand";
import { join as pathJoin } from "path";
import MembersManager from "../members/membersManager";
import { mergeObjects } from "../../utils";

const serversPath = pathJoin(process.cwd(), "servers");

export default class Server {
    private _id: bigint;
    readonly bot: Bot;
    readonly guild: Discord.Guild;
    private commands: ServerCommand[] = [];
    readonly members: MembersManager;
    config!: ServerConfig;
    name: string;

    constructor(bot: Bot, id: bigint) {
        this._id = id;
        this.bot = bot;
        const guild = this.bot.client.guilds.cache.get(`${id}`);
        if (!guild) throw new Error("Guild not found");
        this.guild = guild;

        this.name = guild.name;

        this.loadConfig();
        this.loadCommands();

        this.members = new MembersManager(this);

        this.bot.client.on("interactionCreate", interaction => {
            if (interaction.isCommand()) {
                let command = this.commands.find(c => c.command?.id === interaction.commandId);
                if (command) command.onUsed(this, interaction);
            }
        });
    }

    get id() {
        return this._id;
    }

    private loadConfig(): void {
        let config = JSON.parse(fs.readFileSync(`${serversPath}/${this.id}/config.json`).toString());

        let globalConfig = this.bot.config;

        let config2 = JSON.parse(JSON.stringify(globalConfig));

        mergeObjects(config2, config);

        this.config = config2;
    }

    private loadCommands() {
        let config: ServerCommandsConfig = JSON.parse(
            fs.readFileSync(`${serversPath}/${this.id}/commands.json`).toString()
        );

        config.forEach(command => {
            this.commands.push(new ServerCommand(this, command));
        });

        let globalConfig: ServerCommandsConfig = JSON.parse(
            fs.readFileSync(`${serversPath}/all/commands.json`).toString()
        );

        globalConfig.forEach(command => {
            this.commands.push(new ServerCommand(this, command));
        });
    }
}
