import Discord from "discord.js";
import Server from "./server/server";
import XpManager from "./xpManager/xpManager";

export default class Bot {
    readonly client: Discord.Client<true>;

    private xpManager?: XpManager;

    constructor(token: string) {
        this.client = new Discord.Client({
            intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "DIRECT_MESSAGE_REACTIONS"],
        });
        this.client.login(token);

        this.client.on("ready", async client => {
            console.log("Bot ready");

            new XpManager(this, new Server(this, 664438592093028374n));
            new XpManager(this, new Server(this, 868165566442143784n));
        });
    }
}
