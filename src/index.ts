import config from "./config";
import Bot from "./bot/bot";
import { Database } from "./data/database";
import { execSync } from "child_process";
import Server from "./server";
import Constants from "./common/constants";
import { writeFile } from "fs/promises";

process.title = "CostaBot";

process.on("uncaughtException", async e => {
    await reportE(e);
});

process.on("exit", async () => {
    await reportE(null);
});

process.on("unhandledRejection", async e => {
    await reportE(e as any);
});

async function reportE(e: Error | null) {
    const date = new Date();
    await writeFile(
        `crash report ${date.toDateString()} ${date.getHours()}h${date.getMinutes()} ${date.getSeconds()}s`,
        e?.name + "\n" + e?.message + "\n\n\n" + e?.stack
    );
}

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
