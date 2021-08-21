import config from "./config";
import Bot from "./bot/bot";
import { Database } from "./data/database";
import { execSync } from "child_process";
import Server from "./server";
import Constants from "./common/constants";

process.title = "CostaBot";

try {
    execSync("ffmpeg -version");
} catch (e) {
    console.log("\x1b[31m%s\x1b[0m", "\n\nFfmpeg not found\nPlease reinstall it or add it to the path (windows)\n\n");
    process.exit(-1);
}

Database.connect().then(() => {
    const bot = new Bot(config.bot.token, () => {
        Constants.bot = bot;
        Server.listen();
    });
});
