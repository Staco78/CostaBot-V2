import NodeParser from "./nodeParser";
import { Token, Tokens } from "./tokens";
import fetch from "node-fetch";
import { CommandInteraction } from "discord.js";
import Server from "../../server/server";
import config from "../../../config";

export default class Interpreter {
    private text;
    private globalObj: any;

    constructor(text: string, server: Server, interaction: CommandInteraction) {
        this.text = text;

        this.globalObj = {
            json: (str: string) => JSON.parse(str),

            fetch: async (url: string) => (await fetch(url)).text(),

            args: interaction.options.data,
            user: JSON.parse(JSON.stringify(interaction.user)),
            server: {
                id: server.id,
                config: server.config,
            },
            website_url: config.websiteUrl,
        };
    }

    async exec(): Promise<string> {
        const node = new NodeParser([new Token(Tokens.STR, this.text)], this.globalObj).parse();

        return `${await node.exec()}`;
    }
}
