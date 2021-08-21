import Discord from "discord.js";
import { Database } from "../../data/database";
import ImageGeneration from "../../imageGeneration/imageGeneration";
import Bot from "../bot";
import Server from "../server/server";
import calcLvl, { calcNextLvl, calcXpForLvl } from "../../common/maths/lvlCalc";

export function exec(bot: Bot, server: Server, interaction: Discord.CommandInteraction) {
    interaction.deferReply().then(async () => {
        if (interaction.options.data[0] && interaction.options.data[0].user) var member = await server.members.get(interaction.options.data[0].user.id);
        else var member = await server.members.get(interaction.user.id);
        const databaseMember = await Database.getMember(member);

        ImageGeneration.showXp({
            PPUrl: member.guildMember.user.avatarURL({ format: "png", size: 256 }) ?? "",
            discriminator: member.guildMember.user.discriminator,
            level: calcLvl(databaseMember.xp),
            username: member.guildMember.displayName,
            xp: databaseMember.xp,
            nextLvlXp: calcNextLvl(databaseMember.xp),
            rank: await member.getRank(),
            lvlPassRatio: (() => {
                const actualLvl = calcXpForLvl(calcLvl(databaseMember.xp));
                const nextLvl = calcNextLvl(databaseMember.xp);

                return (databaseMember.xp - actualLvl) / (nextLvl - actualLvl);
            })(),
        }).then(image => {
            let attachement = new Discord.MessageAttachment(image);
            interaction.editReply({ files: [attachement] });
        });
    });
}
