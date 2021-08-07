import { Token, Tokens } from "./tokens";

export default class Interpreter {
    private text;
    private tokens: Token[] = [];

    constructor(text: string) {
        this.text = text;
    }

    exec() {
        this.makeTokens();
    }

    private makeTokens() {
        this.tokens = new TokenParser(this.text).makeTokens();
        console.log(this.tokens);
    }
}

class TokenParser {
    private text;
    private current_char!: string;
    private pos: number = -1;
    private tokens: Token[] = [];

    constructor(text: string) {
        this.text = text;
        this.advance();
    }

    makeTokens(): Token[] {
        while (this.current_char) {
            if (this.current_char === "") this.advance();
            else if (this.current_char.match(/[a-z]/i)) this.tokens.push(this.detectWord());
            else if (this.current_char === "(") {
                this.tokens.push(new Token(Tokens.LEFT_PARENT));
                this.advance();
            } else if (this.current_char === ")") {
                this.tokens.push(new Token(Tokens.RIGHT_PARENT));
                this.advance();
            } else throw new Error(`Unkown token "${this.current_char}"`);
        }

        return this.tokens;
    }

    private advance() {
        this.pos++;
        this.current_char = this.text[this.pos];
    }

    private detectWord(): Token {
        let word = "";
        while (this.current_char && this.current_char.match(/[a-z]/i)) {
            word += this.current_char;
            this.advance();
        }

        return new Token(Tokens.WORD, word);
    }
}
