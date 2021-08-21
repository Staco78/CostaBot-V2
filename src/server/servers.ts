import { Request, Response } from "express";
import fs from "fs/promises";
import { join as pathJoin } from "path";

import type { APIPartialGuild } from "discord-api-types";
import { Database } from "../data/database";
import calcLvl from "../common/maths/lvlCalc";
import Constants from "../common/constants";

export async function getServers(req: Request, res: Response) {
    const guilds: { id: string }[] = (req as any).data;

    const servers = await fs.readdir(pathJoin(process.cwd(), "servers"));

    res.json(guilds.filter(guild => servers.includes(guild.id)));
}

export async function getServer(req: Request, res: Response) {
    const guild: APIPartialGuild = (req as any).data.find((guild: any) => guild.id === req.params.id);

    if (!guild) {
        res.status(404).type("text").end("Not found");
        return;
    }

    const ranking = await getRanking(guild);

    res.json({ id: guild.id, name: guild.name, icon: guild.icon, ranking });
}

async function getRanking(guild: APIPartialGuild): Promise<ServerRanking> {
    const users = await Database.getServerMembers(BigInt(guild.id));

    const server = Constants.bot.servers.find(server => server.id.toString() === guild.id);

    if (!server) throw new Error("Server not found");

    const returnUsers: ServerRankingUser[] = [];

    for (const user of users) {
        const member = await server.members.get(user.id);

        returnUsers.push({
            id: user.id,
            avatarURL: member.guildMember.user.displayAvatarURL(),
            discriminator: member.guildMember.user.discriminator,
            lvl: calcLvl(user.xp),
            username: member.guildMember.displayName,
            xp: user.xp,
        });
    }

    return { users: returnUsers };
}
