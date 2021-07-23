import config from "./config";
import Bot from "./bot/bot";
import { Database } from "./data/database";

Database.connect().then(() => {
    new Bot(config.token);
});
