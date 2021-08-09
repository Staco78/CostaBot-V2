import NodeParser from "./nodeParser";
import { Token, Tokens } from "./tokens";
import fetch from "node-fetch";
import { CommandInteraction } from "discord.js";

export default class Interpreter {
    private text;
    private globalObj: any;

    constructor(text: string, interaction: CommandInteraction) {
        this.text = text;

        this.globalObj = {
            json: (str: string) => JSON.parse(str),

            fetch: async (url: string) => (await fetch(url)).text(),
            
            args: interaction.options.data,
            user: JSON.parse(JSON.stringify(interaction.user)),
        };
    }

    async exec(): Promise<string> {
        const node = new NodeParser([new Token(Tokens.STR, this.text)], this.globalObj).parse();

        return `${await node.exec()}`;
    }
}
