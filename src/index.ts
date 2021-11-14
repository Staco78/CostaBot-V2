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
    console.log("\x1b[31m%s\x1b[0m", "Ffmpeg not found\nPlease reinstall it or add it to the path");
    process.exit(-1);
}

Server.listen();
Database.connect().then(() => {
    const bot = new Bot(config.bot.token, () => {
        Constants.bot = bot;
    });
});
