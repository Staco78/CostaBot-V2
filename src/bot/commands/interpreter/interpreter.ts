import NodeParser from "./nodeParser";
import { Token, Tokens } from "./tokens";
import fetch from "node-fetch";

export default class Interpreter {
    private text;
    private globalObj: any;

    constructor(text: string) {
        this.text = text;

        this.globalObj = {
            json: {
                call: (str: string) => JSON.parse(str),
                toString: () => `[Function: json]`,
            },
            fetch: {
                call: async (url: string) => {
                    console.log("fetch", url);

                    return (await fetch(url)).text();
                },
                toString: () => "[Function: fetch]",
            },
        };
    }

    async exec(): Promise<string> {
        const node = new NodeParser([new Token(Tokens.STR, this.text)], this.globalObj).parse();

        return `${await node.exec()}`;
    }
}
