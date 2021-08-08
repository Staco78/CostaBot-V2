import util from "util";

export class Token {
    readonly token;
    readonly value: any;
    constructor(token: string, value: any = null) {
        this.token = token;
        this.value = value;
    }

    [util.inspect.custom]() {
        return this.toString();
    }

    toString() {
        if (this.value) return `${this.token}:${this.value}`;
        return this.token;
    }
}

export class TokenParser {
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
            
            if (this.current_char === " ") this.advance();
            else if (this.current_char.match(/[a-z]/i)) this.tokens.push(this.detectWord());
            else if (this.current_char === "(") {
                this.tokens.push(new Token(Tokens.LEFT_PARENT));
                this.advance();
            } else if (this.current_char === ")") {
                this.tokens.push(new Token(Tokens.RIGHT_PARENT));
                this.advance();
            } else if (this.current_char === ".") {
                this.tokens.push(new Token(Tokens.DOT));
                this.advance();
            } else if (this.current_char.match(/["'`]/)) this.tokens.push(this.detectString());
            else throw new Error(`Unkown token "${this.current_char}"`);
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

    private detectString(): Token {
        let str = "";
        let quot = this.current_char;
        this.advance();

        while (this.current_char && this.current_char.match(new RegExp(`[^${quot}]`))) {
            str += this.current_char;
            this.advance();
        }

        if (!this.current_char) throw new Error("String not finished " + str + " " + this.text);
        this.advance();

        return new Token(Tokens.STR, str);
    }
}

export const Tokens = {
    WORD: "WORD",
    LEFT_PARENT: "(",
    RIGHT_PARENT: ")",
    DOT: "DOT",
    STR: "STR",
};
