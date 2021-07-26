import config from "./config";
import Bot from "./bot/bot";
import { Database } from "./data/database";

process.title = "CostaBot";

Database.connect().then(() => {
    new Bot(config.token);
});
