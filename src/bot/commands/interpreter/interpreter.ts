import NodeParser from "./nodeParser";
import { Token, TokenParser, Tokens } from "./tokens";

export default class Interpreter {
    private text;
    private tokens: Token[] = [];

    constructor(text: string) {
        this.text = text;
    }

    exec() {
        this.makeTokens();

        console.log(this.tokens);

        const node = new NodeParser(this.tokens).parse();

        console.log(node);
        
        console.log(node.exec());
        
    }

    private makeTokens() {
        this.tokens = new TokenParser(this.text).makeTokens();
    }
}
