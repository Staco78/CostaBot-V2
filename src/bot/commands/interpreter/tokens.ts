import util from "util";

export class Token {
    readonly token;
    readonly value: any;
    constructor(token: string, value: any = null) {
        this.token = token;
        this.value = value;
    }

    [util.inspect.custom]() {
        if (this.value) return `${this.token}:${this.value}`;
        return this.token;
    }
}

export const Tokens = {
    WORD: "WORD",
    LEFT_PARENT: "(",
    RIGHT_PARENT: ")",
};
