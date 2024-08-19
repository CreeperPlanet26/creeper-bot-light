import "dotenv/config";
import { promises as fs } from 'fs';
import { CacheType, Client, Collection, FetchMessagesOptions, GatewayIntentBits, Interaction, Message, MessageContextMenuCommandInteraction, MessageReference, TextChannel } from "discord.js";
import { replyFetcherCommand } from "./replyFetcherCommand";
// import { db } from "./db";
import { MessagesTable, messagesTable } from "./schema";
import { and, asc, desc, eq, lt, max, sql } from "drizzle-orm";
import { Client as PgClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { before } from "node:test";

export const TEST_SERVER = "640262033329356822";

// const client = new Client({ restTimeOffset: 75, intents: new Intents(["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS",]) });
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });

// if (process.env.NODE_ENV !== "production") client.login(process.env.DEV_BOT_TOKEN);

const TIMEOUT = 2000;
let STARTED_AT;

const pgClient = new PgClient({
    connectionString: process.env.DATABASE_URI,
});
pgClient.connect();
const db = drizzle(pgClient);

console.log('running in dev')

client.login(process.env.DEV_BOT_TOKEN);

client.on("ready", async () => {
    console.log("Bot is ready");
    (await client.guilds.fetch(TEST_SERVER))?.commands.set([replyFetcherCommand]);

    // const channel: TextChannel = await client.channels.fetch("725143129237356674") as TextChannel;
    // console.log((await channel.messages.fetch({ limit: 1 })).first())
})

client.on("interactionCreate", async (i) => {
    STARTED_AT = Date.now();
    console.time('interactionCreate')
    if (!i.isMessageContextMenuCommand() || i.commandName !== replyFetcherCommand.name) return;
    i.deferReply();

    // let timeLimitReached = false;
    // setTimeout(() => { timeLimitReached = true; }, 2000) //50000


    console.log("starting setTimeout")
    // oldest message in db
    const [oldestRow] = await db
        .select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
        .from(messagesTable)
        .where(eq(messagesTable.channelId, i.channel.id))
        .orderBy(asc(messagesTable.timestamp))
        .limit(1)

    console.log("oldestRow", oldestRow)


    await saveNewestToOldest(i)
    await saveCursorAndAbove(i)
    await fetchNewestToNewest(i)

    // fetch entire channel history for first time. check db here if not already saved. update it otherwise. Fetch after the initial message if there is already data in db. Should not have [message]
    // try to finish installing top chunk of channel if not done already. (oldest in db and keep going up)
    // fetch from newest message in channel to the newest message in db.
    // after 55 seconds has passed since invoked time,   
    try {
        //         const oldMessages = await fetchMessages(oldestRow, timeLimitReached, i)

        //         console.timeEnd('interactionCreate')



        //         if (oldMessages.length > 0 && timeLimitReached) {
        //             oldMessages[0].cursor = true;
        //             await db.insert(messagesTable).values(oldMessages)
        //             i.channel.send("limit reached while fetching old messages");
        //             return i.channel.send(`Only installed old ${oldMessages.length} messages between ${oldMessages[oldMessages.length - 1].timestamp.toLocaleString()} and ${oldMessages[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)
        //         }

        //         console.log("old messages", oldMessages.length)
        //         await db.update(messagesTable).set({ cursor: true }).where(and(eq(messagesTable.cursor, true), eq(messagesTable.channelId, i.channel.id)))
        //         oldMessages.length > 0 && await db.insert(messagesTable).values(oldMessages)
        //         oldMessages.length > 0 && i.channel.send(`Finished installed old ${oldMessages.length} messages between ${oldMessages[oldMessages.length - 1].timestamp.toLocaleString()} and ${oldMessages[0].timestamp.toLocaleString()}.`)

        //         // then fetch from cursor to up to newest message in db
        //         const [cursorRow] = await db
        //             .select({ id: messagesTable.id })
        //             .from(messagesTable)
        //             .where(and(eq(messagesTable.channelId, i.channel.id), eq(messagesTable.cursor, true)))
        //             .limit(1)

        //         if (cursorRow?.id) {
        //             const [{ id: cursorNewestMessageId }] = await db
        //                 .select({ id: messagesTable.id })
        //                 .from(messagesTable)
        //                 .where(eq(messagesTable.channelId, i.channel.id))
        //                 .orderBy(desc(messagesTable.timestamp))
        //                 .limit(1)

        //             const cursorMessages = await fetchMessages(cursorRow, timeLimitReached, i, cursorNewestMessageId);
        //             if (timeLimitReached) {
        //                 console.log("time limit reached cursor messages", cursorMessages.length)
        //                 cursorMessages[0].cursor = true;
        //                 cursorMessages.length > 0 && await db.insert(messagesTable).values(cursorMessages)
        //                 i.channel.send("limit reached while fetching cursor messages");
        //                 return i.channel.send(`Only installed cursor ${cursorMessages.length} messages between ${cursorMessages[cursorMessages.length - 1].timestamp.toLocaleString()} and ${cursorMessages[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)
        //             }

        //             await db.update(messagesTable).set({ cursor: false }).where(eq(messagesTable.cursor, true))
        //             cursorMessages.length > 0 && await db.insert(messagesTable).values(cursorMessages)
        //             cursorMessages.length > 0 && i.channel.send(`Finished installed cursor ${cursorMessages.length} messages between ${cursorMessages[cursorMessages.length - 1].timestamp.toLocaleString()} and ${cursorMessages[0].timestamp.toLocaleString()}.`)
        //         }

        //         // then fetch from newest message in channel up to newest message in db
        //         const [newestRow] = await db
        //             .select({ id: messagesTable.id })
        //             .from(messagesTable)
        //             .where(eq(messagesTable.channelId, i.channel.id))
        //             .orderBy(desc(messagesTable.timestamp))
        //             .limit(1)

        //         const newMessages = await fetchMessages(newestRow, timeLimitReached, i, null, true);
        //         if (newMessages.length > 0 && timeLimitReached) {
        //             newMessages[0].cursor = true;
        //             await db.insert(messagesTable).values(newMessages)
        //             i.channel.send("limit reached while fetching new messages");
        //             return i.channel.send(`Only installed ${newMessages.length} new messages between ${newMessages[newMessages.length - 1].timestamp.toLocaleString()} and ${newMessages[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)

        //         }
        //         console.log("new messages", newMessages.length)
        //         await db.update(messagesTable).set({ cursor: false }).where(eq(messagesTable.cursor, true))
        //         newMessages.length > 0 && await db.insert(messagesTable).values(newMessages)
        //         newMessages.length > 0 && i.channel.send(`Finished installed new ${newMessages.length} messages between ${newMessages[newMessages.length - 1].timestamp.toLocaleString()} and ${newMessages[0].timestamp.toLocaleString()}.`)


    } catch (error) {
        console.error(error)
        i.editReply("An error occurred")
    }
})

// find the oldest row then fetch messages before that.
async function saveNewestToOldest(i: MessageContextMenuCommandInteraction<CacheType>) {
    const [oldestRow] = await db
        .select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
        .from(messagesTable)
        .where(eq(messagesTable.channelId, i.channel.id))
        .orderBy(asc(messagesTable.timestamp))
        .limit(1)

    const msgs = oldestRow ? await fetchMessages(i, oldestRow.id) : null

    if (!msgs) {
        i.channel.send("Old messages already installed")
        return []
    }
    await db.insert(messagesTable).values(msgs);
    if (!msgs[msgs.length - 1].cursor) return i.channel.send(`Finished installed old ${msgs.length} messages between ${msgs[msgs.length - 1].timestamp.toLocaleString()} and ${msgs[0].timestamp.toLocaleString()}.`)
    return i.channel.send(`Only installed old ${msgs.length} messages between ${msgs[msgs.length - 1].timestamp.toLocaleString()} and ${msgs[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)
}

// 
async function saveCursorAndAbove(i: MessageContextMenuCommandInteraction<CacheType>) {
    const cursorRows = await db
        .select({ id: messagesTable.id, timestamp: messagesTable.timestamp, cursor: messagesTable.cursor, authorId: messagesTable.authorId, channelId: messagesTable.channelId })
        .from(messagesTable)
        .where(and(eq(messagesTable.channelId, i.channel.id), eq(messagesTable.cursor, true)))
        .orderBy(desc(messagesTable.timestamp))
    console.log(cursorRows.length, "cursor rows length intial", findDuplicatesWithCounts(cursorRows))
    const msgs = new Map<string, MessagesTable>();
    for (const index in cursorRows) {
        // can either handle time limit or use last message cursor to determine. might not work due to fetched references
        // const fetched = cursorRows[Number(index) + 1]?.id ? await fetchMessages(i, cursorRows[index].id, cursorRows[Number(index) + 1].id)
        //     : await fetchMessages(i, cursorRows[index].id, await db.select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
        //         .from(messagesTable)
        //         .where(and(eq(messagesTable.channelId, i.channel.id), lt(messagesTable.timestamp, cursorRows[index].timestamp)))
        //         .orderBy(desc(messagesTable.timestamp))[0])
        console.log(cursorRows[index].id, (await db.select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
            .from(messagesTable)
            .where(and(eq(messagesTable.channelId, i.channel.id), lt(messagesTable.timestamp, cursorRows[index].timestamp)))
            .orderBy(desc(messagesTable.timestamp)))[0]?.id, "this is the id")
        const fetched = await fetchMessages(i, cursorRows[index].id, (await db.select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
            .from(messagesTable)
            .where(and(eq(messagesTable.channelId, i.channel.id), lt(messagesTable.timestamp, cursorRows[index].timestamp)))
            .orderBy(desc(messagesTable.timestamp)))[0]?.id)


        console.log(msgs.size, "msgs length", "fetched length", fetched?.length, "before", cursorRows[Number(index) + 1]?.id ? `${cursorRows[index].id} to ${cursorRows[Number(index) + 1].id}` : cursorRows[index].id)
        if (fetched?.length > 0) {
            cursorRows[index].cursor = false;
            for (const m of fetched) msgs.set(m.id, m)
            console.log("theee one that is being added to the map is ", cursorRows[index].id)
            msgs.set(cursorRows[index].id, cursorRows[index])

            if (new Date() > TIMEOUT + STARTED_AT) break;
        }
    }

    console.log("these r the cursor rows", cursorRows, msgs.size, Array.from(msgs.values())[0], Array.from(msgs.values())[msgs.size - 1])
    console.log(findDuplicatesWithCounts(msgs))
    //    for (const d of findDuplicatesWithCounts(msgs)) {
    // msgs = Array.from(new Map(msgs.map(m => [m.id, m])).values())
    console.log("is there still any duplicates", findDuplicatesWithCounts(msgs))

    if (!msgs.size) {
        i.channel.send("No cursor messages at this time")
        return []
    }
    for (const c of cursorRows) console.log((await i.channel.messages.fetch(c.id)).url)


    await db.insert(messagesTable).values(Array.from(msgs.values())).onConflictDoUpdate({ target: messagesTable.id, set: { cursor: sql.raw(`excluded.${messagesTable.cursor.name}`) } })


    // should return after the loop is done and there is no msgs at all
    if (!Array.from(msgs.values()).find(m => m.cursor)) return i.channel.send(`Finished installed cursor ${msgs.size} messages between ${Array.from(msgs.values())[msgs.size - 1].timestamp.toLocaleString()} and ${Array.from(msgs.values())[0].timestamp.toLocaleString()} (${cursorRows.length}).`)
    return i.channel.send(`Only installed cursor ${msgs.size} messages between ${Array.from(msgs.values())[msgs.size - 1].timestamp.toLocaleString()} and ${Array.from(msgs.values())[0].timestamp.toLocaleString()} (${cursorRows.length}). Re-run the command to download the rest.`)

}

async function fetchNewestToNewest(i: MessageContextMenuCommandInteraction<CacheType>) {
    const [newestRow] = await db
        .select({ id: messagesTable.id })
        .from(messagesTable)
        .where(eq(messagesTable.channelId, i.channel.id))
        .orderBy(desc(messagesTable.timestamp))
        .limit(1)

    const msgs = await fetchMessages(i, null, newestRow ? newestRow.id : null)

    if (!msgs.length) {
        i.channel.send("New messages already installed")
        return []
    }

    await db.insert(messagesTable).values(msgs);
    if (!msgs[msgs.length - 1].cursor) return i.channel.send(`Finished installed new ${msgs.length} messages between ${msgs[msgs.length - 1].timestamp.toLocaleString()} and ${msgs[0].timestamp.toLocaleString()}.`)
    return i.channel.send(`Only installed new ${msgs.length} messages between ${msgs[msgs.length - 1].timestamp.toLocaleString()} and ${msgs[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)
}

// newest to oldest. before & until not included
async function fetchMessages(i: MessageContextMenuCommandInteraction<CacheType>, beforeId?: string, untilId?: string): Promise<MessagesTable[]> {
    console.log(beforeId, untilId, "this is the id")
    let coll: Collection<string, Message>;
    let messages = [];
    const referencedMessages: MessageReference[] = [];

    if (!beforeId) coll = await i.channel.messages.fetch({ limit: 1 })

    else coll = await i.channel.messages.fetch({ limit: 100, before: beforeId })
    beforeId = coll.last()?.id;
    const interval = setInterval(() => {
        i.editReply(`Downloading ${messages.length} messages between ${messages[messages.length - 1].createdAt.toLocaleString()} and ${messages[0].createdAt.toLocaleString()}... + ${Date.now()}`)
    }, 20000)

    while (beforeId && Date.now() < TIMEOUT + STARTED_AT) {
        console.log("messages array length", messages.length, "coll length", coll.size)

        for (const [_, msg] of coll) {
            // console.log("this is the message id", msg.id, msg.createdAt.toLocaleString(), "this is the until id", untilId)
            if (msg.id !== untilId) {
                messages.push(msg)
                if (msg.reference?.messageId) referencedMessages.push(msg.reference)

            }

            if (msg.id === untilId) {
                const r = messages.map(m => ({
                    authorId: m.author.id,
                    id: m.id,
                    channelId: m.channelId,
                    timestamp: m.createdAt,
                    reference: m.reference?.messageId,
                    content: m.content,
                    cursor: false
                }));


                clearInterval(interval);
                return Array.from(new Map(
                    r.concat(await fetchReferences(i, referencedMessages))
                        .map(item => [item.id, item])
                ).values());
            }
        }

        // coll = (await i.channel.messages.fetch({ limit: 100, before: beforeId })) //moved

        if (coll.size === 0) {
            console.log("the size is zero!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            const r = messages.map(m => ({
                authorId: m.author.id,
                id: m.id,
                channelId: m.channelId,
                timestamp: m.createdAt,
                reference: m.reference?.messageId,
                content: m.content,
                cursor: false
            }));

            clearInterval(interval);
            return Array.from(new Map(
                r.concat(await fetchReferences(i, referencedMessages))
                    .map(item => [item.id, item])
            ).values());

        }
        coll = (await i.channel.messages.fetch({ limit: 100, before: beforeId }))


        if (!coll.size) {
            // test
            const r = messages.map(m => ({
                authorId: m.author.id,
                id: m.id,
                channelId: m.channelId,
                timestamp: m.createdAt,
                reference: m.reference?.messageId,
                content: m.content,
                cursor: false
            }));

            clearInterval(interval);
            return Array.from(new Map(
                r.concat(await fetchReferences(i, referencedMessages))
                    .map(item => [item.id, item])
            ).values());
        }
        console.log("after loop", messages.length, coll.size)
        beforeId = coll.last().id;
    }

    clearInterval(interval);
    if (Date.now() > TIMEOUT + STARTED_AT) {
        console.log("timeout reached")
        if (!messages.length) return [];

        for (const msg of messages) {
            if (msg.reference?.messageId && !referencedMessages.find(m => m.messageId === msg.reference.messageId)) {
                console.log("ADDED ITEM!!!!!!"); referencedMessages.push(msg.reference)
            }
        }

        console.log("this is the message legnth", messages.length)
        console.log("this is the coll legnth", coll.size)
        const r = messages.map(m => ({
            authorId: m.author.id,
            id: m.id,
            channelId: m.channelId,
            timestamp: m.createdAt,
            reference: m.reference?.messageId,
            content: m.content,
            cursor: false
        }));
        r[r.length - 1].cursor = true;

        return Array.from(new Map(
            r.concat(await fetchReferences(i, referencedMessages))
                .map(item => [item.id, item])
        ).values());

    }




    // await i.channel.messages.fetch(o)

}

async function fetchReferences(i: MessageContextMenuCommandInteraction<CacheType>, references: MessageReference[]): Promise<MessagesTable[]> {
    const msgs = [];

    for (const r of references) {
        const c = <TextChannel>await client.channels.fetch(r.channelId);
        const m = await c.messages.fetch(r.messageId);

        msgs.push({
            authorId: m.author.id,
            id: m.id,
            channelId: m.channelId,
            timestamp: m.createdAt,
            reference: m.reference?.messageId,
            content: m.content,
            cursor: false,
        })

        if (m.reference?.messageId) {
            for (const msg of await fetchReferences(i, [m.reference])) msgs.push(msg)
        }
    }

    return msgs
}

// async function fetchMessages(row, timeLimitReached, i: MessageContextMenuCommandInteraction<CacheType>, cursorNewestMessageId?, fetchTillNewest?) {
//     console.log("should fetch till newest", fetchTillNewest)
//     const interval = setInterval(() => {
//         i.editReply(`Downloading ${messages.length} messages between ${messages[messages.length - 1].timestamp.toLocaleString()} and ${messages[0].timestamp.toLocaleString()}...`)
//     }, 20000)
//     let message: Message;
//     if (fetchTillNewest) message = (await i.channel.messages.fetch({ limit: 1 })).first();
//     else if (row?.id) message = await i.channel.messages.fetch(row.id)
//     else message = (await i.channel.messages.fetch({ limit: 1 })).first();

//     console.log("message test", message)
//     console.log("message first time", message && message.createdAt.toLocaleString())
//     // if (message === row.id) return []

//     i
//     let messages = row?.id ? [] : [{
//         content: message.content,
//         authorId: message.author.id,
//         id: message.id,
//         channelId: message.channelId,
//         timestamp: message.createdAt,
//         reference: message.reference?.messageId,
//         cursor: false
//     }];

//     while (message && !timeLimitReached) {
//         console.log(messages.length, "array", message.createdAt.toLocaleString())

//         console.log("going to fetch messages before", message.createdAt.toLocaleString())
//         const coll = await i.channel.messages.fetch({ limit: 100, before: message.id })
//         console.log("message given to us", coll.last()?.createdAt.toLocaleString(), coll.size)

//         if (!coll.size) {
//             // message = null;
//             clearInterval(interval);
//             return [];
//         }
//         if (coll.last() === cursorNewestMessageId || coll.last() === row?.id) {
//             // message = null;
//             clearInterval(interval);
//             return []
//         }
//         if (fetchTillNewest && coll.has(row?.id)) {
//             for (const [_, m] of coll) {
//                 console.log(m.createdAt.toLocaleString())
//                 if (m.id === row.id) {
//                     console.log("found row id", m.createdAt.toLocaleString())
//                     console.log(messages.length)

//                     clearInterval(interval);
//                     return messages
//                 }
//                 messages.push({
//                     content: m.content,
//                     authorId: m.author.id,
//                     id: m.id,
//                     channelId: m.channelId,
//                     timestamp: m.createdAt,
//                     reference: m.reference?.messageId,
//                     cursor: false
//                 })
//             }
//         }
//         coll.forEach(m => messages.push({
//             content: m.content,
//             authorId: m.author.id,
//             id: m.id,
//             channelId: m.channelId,
//             timestamp: m.createdAt,
//             reference: m.reference?.messageId,
//             cursor: false
//         }));
//         message = coll.size > 0 ? coll.last() : null;
//     }

//     clearInterval(interval);
//     return messages;
// }


async function fetchMessageURL(msgs: MessagesTable[], i: Interaction) {
    return i.channel.send(`Only installed old ${msgs.length} messages between [${msgs[msgs.length - 1].timestamp.toLocaleString()}](${(await i.channel.messages.fetch(msgs[msgs.length - 1].id)).url}) and [${msgs[0].timestamp.toLocaleString()}](${(await i.channel.messages.fetch(msgs[0].id)).url}). Re-run the command to download the rest.`)


}

// // Register Slash Commands
// client.application.commands.set([countingCommand, fortniteCommand, avatarCommand, replyFetcherCommand])
// client.application.commands.create(countingCommand)
// client.application.commands.create(fortniteCommand)
// client.application.commands.create(avatarCommand)
// client.application.commands.create(replyFetcherCommand)




function findDuplicatesWithCounts(arr) {
    // Create a Map to store counts of each ID
    const idCountMap = new Map();

    // Iterate through the array to count occurrences
    arr.forEach(item => {
        const id = item.id;
        // Increment the count of the current ID
        idCountMap.set(id, (idCountMap.get(id) || 0) + 1);
    });

    // Create an array to store duplicates with their counts
    const duplicates = [];

    // Iterate through the Map to collect IDs with more than one occurrence
    idCountMap.forEach((count, id) => {
        if (count > 1) {
            duplicates.push({ id, count });
        }
    });

    return duplicates;
}
