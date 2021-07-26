import Discord from "discord.js";
import { ImageGeneration } from "../../imageGeneration/imageGeneration";
import Bot from "../bot";
import Server from "../server/server";

export function exec(bot: Bot, server: Server, interaction: Discord.CommandInteraction) {
    interaction.defer().then(async () => {
        const classement = await createClassement(server);
        interaction.editReply({ files: [new Discord.MessageAttachment(classement)] });
    });
}

async function createClassement(server: Server): Promise<Buffer> {
    await server.members.update();

    return await ImageGeneration.generateClassement(server.members.array, 0);
}
