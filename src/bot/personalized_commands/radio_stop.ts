import Discord from "discord.js";

import Bot from "../bot";
import Server from "../server/server";

export function exec(bot: Bot, server: Server, interaction: Discord.CommandInteraction) {
    if (server.radioPlayer) {
        server.radioPlayer.stop();
        server.radioPlayer = null;
        interaction.reply("La radio s'est arrétée");
    } else throw new Error("La radio n'est pas allumée");
}
