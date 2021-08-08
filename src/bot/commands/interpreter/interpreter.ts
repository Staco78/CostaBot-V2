import NodeParser from "./nodeParser";
import { Token, TokenParser, Tokens } from "./tokens";

export default class Interpreter {
    private text;
    private tokens: Token[] = [];
    private globalObj: any;

    constructor(text: string) {
        this.text = text;

        this.globalObj = {
            json: {
                call: (str: string) => JSON.parse(str),
                toString: () => `[Function: json]`,
            },
            abc: { x: "coucou" },
        };
    }

    exec(): string {
        const node = new NodeParser([new Token(Tokens.STR, this.text)], this.globalObj).parse();

        return `${node.exec()}`;
    }
}
