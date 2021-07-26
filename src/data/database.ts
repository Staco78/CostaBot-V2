import { Collection, Db, MongoClient } from "mongodb";
import Member from "../bot/members/member";
import Server from "../bot/server/server";
import config from "../config";

export namespace Database {
    let client: MongoClient;
    let db: Db;
    let memberCollection: Collection;

    export async function connect() {
        client = await new MongoClient(config.database.url).connect();

        db = client.db("CostaBot");
        memberCollection = db.collection("members");
    }

    export async function getMember(member: Member): Promise<DatabaseMember> {
        const response = (await memberCollection.findOne(
            { id: member.id, server: member.guild.id },
            { projection: { _id: 0 } }
        )) as any;

        if (response) return response as DatabaseMember;

        await createMember(member);
        return await getMember(member);
    }

    export async function editMember(member: Member, dataToSet: object): Promise<DatabaseMember> {
        const response = (await memberCollection.findOneAndUpdate(
            { id: member.id, server: member.guild.id },
            { $set: dataToSet },
            { projection: { _id: 0 } }
        )) as any;

        if (response.value) return response as DatabaseMember;

        await createMember(member);
        return editMember(member, dataToSet);
    }

    export async function addValueToMember(
        member: Member,
        dataToAdd: { [key: string]: number }
    ): Promise<DatabaseMember> {
        const response = (await memberCollection.findOneAndUpdate(
            { id: member.id, server: member.guild.id },
            { $inc: dataToAdd },
            { projection: { _id: 0 } }
        )) as any;

        if (response.value) return response.value;

        await createMember(member);
        return addValueToMember(member, dataToAdd);
    }

    export async function setValueToMember(
        member: Member,
        dataToSet: { [key: string]: number }
    ): Promise<DatabaseMember> {
        const response = (await memberCollection.findOneAndUpdate(
            { id: member.id, server: member.guild.id },
            { $set: dataToSet },
            { projection: { _id: 0 } }
        )) as any;

        if (response.value) return response.value;

        await createMember(member);
        return addValueToMember(member, dataToSet);
    }

    export async function createMember(member: Member) {
        await memberCollection.insertOne({
            id: member.id,
            server: member.guild.id,
            xp: 0,
            name: member.guildMember.displayName,
            lastMessageTimestamp: 0,
        });
    }

    export async function getServerMembers(server: Server): Promise<DatabaseMember[]> {
        return await memberCollection.find({ server: server.id.toString() }, { sort: { xp: -1 } }).toArray();
    }
}
