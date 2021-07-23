import { Collection, Db, MongoClient } from "mongodb";
import Member from "../bot/members/member";
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

    export async function getMember(member: Member): Promise<DatabaseMember | undefined> {
        const response = memberCollection.findOne(
            { id: member.id, server: member.guild.id },
            { projection: { _id: 0 } }
        ) as any;

        if (response.id) return response as DatabaseMember;

        await createMember(member);
        return getMember(member);
    }

    export async function editMember(member: Member, dataToSet: object): Promise<DatabaseMember> {
        const response = memberCollection.findOneAndUpdate(
            { id: member.id, server: member.guild.id },
            { $set: dataToSet },
            { projection: { _id: 0 } }
        ) as any;

        if (response.id) return response as DatabaseMember;

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

    export async function createMember(member: Member) {
        await memberCollection.insertOne({
            id: member.id,
            server: member.guild.id,
            xp: 0,
            name: member.guildMember.displayName,
        });
    }
}
