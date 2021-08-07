import { Token, Tokens } from "./tokens";
import util from "util";

export default class NodeParser {
    private tokens: Token[];
    private current_token!: Token;
    private pos = -1;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.advance();
    }

    private advance() {
        this.pos++;
        this.current_token = this.tokens[this.pos];
    }

    parse(): Node<any> {
        switch (this.current_token.token) {
            case Tokens.STR:
                return new StrNode(this.current_token.value);
            case Tokens.WORD:
                switch (this.current_token.value) {
                    case "json":
                        return this.detectJson();
                    default:
                        throw new Error(`${this.current_token.value} is not defined`);
                }
            case Tokens.RIGHT_PARENT:
                return new NullNode();
            default:
                throw new Error("Unkown token " + this.current_token);
        }
    }

    private detectJson(): JsonNode {
        this.advance();
        if (this.current_token.token !== Tokens.LEFT_PARENT) throw new Error("Missing parentheses");

        this.advance();

        if (this.current_token.token === Tokens.RIGHT_PARENT) return new JsonNode(new NullNode());

        const content = this.parse();

        this.advance();

        if (this.current_token.token !== Tokens.RIGHT_PARENT) throw new Error("Missing parentheses");

        return new JsonNode(content);
    }
}

export abstract class Node<T = string> {
    abstract exec(): T;
}

export class StrNode extends Node {
    value: string;
    constructor(value: string) {
        super();

        this.value = value;
    }

    exec() {
        return this.value;
    }

    [util.inspect.custom]() {
        return this.toString();
    }

    toString() {
        return `"${this.value}"`;
    }
}

export class JsonNode extends Node<object> {
    content: Node<any>;
    constructor(content: Node<any>) {
        super();

        this.content = content;
    }

    exec() {
        return JSON.parse(`${this.content.exec()}`);
    }

    [util.inspect.custom]() {
        return this.toString();
    }

    toString() {
        return `JSON(${this.content})`;
    }
}

export class NullNode extends Node<null> {
    exec() {
        return null;
    }

    [util.inspect.custom]() {
        return this.toString();
    }

    toString() {
        return "null";
    }
}
