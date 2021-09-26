import { Collection, Db, MongoClient } from "mongodb";
import Member from "../bot/members/member";
import config from "../config";
import DefaultObjects from "../defaultObjects";
import Utils from "../utils";

export namespace Database {
    let client: MongoClient;
    let db: Db;
    let memberCollection: Collection;

    export async function connect() {
        client = await new MongoClient(config.database.url).connect();

        console.log("Database: connected");

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

        console.log("Database: member getted");

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

        console.log("Database: member edited");

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

        console.log("Database: member edited");

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

        console.log("Database: member edited");

        return addValueToMember(member, dataToSet);
    }

    export async function createMember(member: Member) {
        await memberCollection.insertOne({
            id: member.id,
            server: member.guild.id,
            xp: 0,
            lastMessageTimestamp: 0,
        });

        console.log("Database: member created");
    }

    export async function getServerMembers(serverId: bigint): Promise<DatabaseMember[]> {
        const members = await memberCollection.find({ server: serverId.toString() }, { sort: { xp: -1 } }).toArray();

        for (const member of members) {
            if (!Utils.checkObject(member, DefaultObjects.databaseMember)) throw new Error("Database member not valid");
        }

        return members as any;
    }

    export async function deleteMember(serverId: string, memberId: string): Promise<void> {
        await memberCollection.deleteOne({ server: serverId, id: memberId });

        console.log("Database: member deleted");
    }
}
