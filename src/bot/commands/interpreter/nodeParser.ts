import { Token, TokenParser, Tokens } from "./tokens";
import util from "util";

export default class NodeParser {
    private tokens: Token[];
    private current_token!: Token;
    private pos = -1;
    private globalObj: any;

    constructor(tokens: Token[], globalObj: any) {
        this.tokens = tokens;
        this.globalObj = globalObj;
        this.advance();
    }

    private advance() {
        this.pos++;
        this.current_token = this.tokens[this.pos];
    }

    parse(): Node<any> {
        switch (this.current_token.token) {
            case Tokens.STR:
                const node = new StrNode(this.current_token.value, this.globalObj);
                this.advance();
                return node;
            case Tokens.WORD:
                return this.detectObjectAccess();
            case Tokens.RIGHT_PARENT:
                return new NullNode();
            default:
                throw new Error("Unkown token " + this.current_token);
        }
    }

    private detectObjectAccess(): Node<any> {
        let node: Node<any> = new ObjectAccessNode(null, this.current_token.value, this.globalObj);
        this.advance();

        while (this.current_token && (this.current_token.token === Tokens.DOT || this.current_token.token === Tokens.LEFT_PARENT)) {
            if (this.current_token.token === Tokens.DOT) {
                this.advance();

                node = new ObjectAccessNode(node, this.current_token.value, this.globalObj);
                this.advance();
            } else {
                this.advance();
                const param = this.parse();
                node = new FunctionCallNode(node, param);
                this.advance();
            }
        }

        return node;
    }
}

abstract class Node<T = string> {
    abstract exec(): Promise<T>;

    [util.inspect.custom]() {
        return this.toString();
    }
}

class StrNode extends Node {
    private str: string;
    private execNodes: [string, Node<any>][] = [];
    private globalObj: any;

    constructor(str: string, globalObj: any) {
        super();

        this.str = str;
        this.globalObj = globalObj;

        if (this.str.match(/\${[^}]*}/gm)) {
            let execStr = "";
            let execsStr: string[] = [];
            let strMode: null | string = null;
            let execMode = false;
            let i = 0;
            while (this.str[i]) {
                if (this.str[i].match(/["'`]/g)) {
                    if (execMode) {
                        if (strMode && this.str[i] === strMode) strMode = null;
                        else if (!strMode) strMode = this.str[i];
                    }
                    i++;
                } else if (this.str[i] === "$") {
                    if (!strMode && !execMode) {
                        i++;
                        if (this.str[i] === "{") execMode = true;
                    }
                    i++;
                } else i++;

                if (execMode) {
                    if (this.str[i] === "}" && !strMode) {
                        execMode = false;
                        execsStr.push(execStr);
                        execStr = "";
                        i++;
                    } else execStr += this.str[i];
                }
            }

            execsStr.forEach(str => {
                const tokens = new TokenParser(str).makeTokens();
                this.execNodes.push([str, new NodeParser(tokens, this.globalObj).parse()]);
            });
        }
    }

    async exec() {
        for (const node of this.execNodes) {
            const exec = await node[1].exec();

            this.str = this.str.replace(`\${${node[0]}}`, `${typeof exec === "object" ? JSON.stringify(exec) : exec}`);
        }

        return this.str;
    }

    toString() {
        return `"${this.str}"`;
    }
}

class NullNode extends Node<null> {
    async exec() {
        return null;
    }

    toString() {
        return "null";
    }
}

class ObjectAccessNode extends Node<any> {
    private content: Node<any> | null;
    private symbolName: string;
    private globalObj: any;

    constructor(content: Node<any> | null, symbol: string, globalObj: any) {
        super();
        this.content = content;
        this.symbolName = symbol;
        this.globalObj = globalObj;
    }

    async exec() {
        if (this.content) return (await this.content.exec())[this.symbolName];
        return this.globalObj[this.symbolName];
    }

    toString() {
        if (this.content) return `${this.content}.${this.symbolName}`;
        return `${this.symbolName}`;
    }
}

class FunctionCallNode extends Node<any> {
    private object: Node<any>;
    private param: Node<any>;

    constructor(object: Node<any>, param: Node<any>) {
        super();
        this.object = object;
        this.param = param;
    }

    async exec() {
        return (await this.object.exec()).call(await this.param.exec());
    }

    toString() {
        return `${this.object}(${this.param})`;
    }
}
