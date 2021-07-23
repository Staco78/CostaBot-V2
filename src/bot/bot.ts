import Discord from "discord.js";
import Server from "./server/server";

export default class Bot {
    readonly client: Discord.Client<true>;
    constructor(token: string) {
        this.client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
        this.client.login(token);

        this.client.on("ready", async client => {
            console.log("Bot ready");

            new Server(this, 664438592093028374n);

           
        });
    }
}
