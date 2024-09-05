import "dotenv/config";
import { CacheType, Client, Collection, FetchMessagesOptions, GatewayIntentBits, Interaction, Message, MessageContextMenuCommandInteraction, MessageReference, TextChannel } from "discord.js";
import { replyFetcherCommand } from "./replyFetcherCommand";
// import { db } from "./db";
import { MessagesTable, messagesTable } from "./schema";
import { and, asc, desc, eq, lt, max, sql } from "drizzle-orm";
import { Client as PgClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { performDFS } from "./dfs";

export const TEST_SERVER = "640262033329356822";
export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// const client = new Client({ restTimeOffset: 75, intents: new Intents(["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS",]) });
let client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });
// process.env.NODE_ENV === "production" && client.login(process.env.BOT_TOKEN);


// if (process.env.NODE_ENV !== "production") client.login(process.env.DEV_BOT_TOKEN);

const TIMEOUT = 30000;
let STARTED_AT;

const pgClient = new PgClient({
    connectionString: process.env.DATABASE_URI,
});
pgClient.connect();
export const db = drizzle(pgClient);

console.log('running in dev')

client.login(process.env.DEV_BOT_TOKEN);

const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

client.on("ready", async () => {
    console.log("Bot is ready");
    process.env.NODE_ENV !== "production" && (await client.guilds.fetch(TEST_SERVER))?.commands.set([replyFetcherCommand]);

    // const channel: TextChannel = await client.channels.fetch("725143129237356674") as TextChannel;
    // console.log((await channel.messages.fetch({ limit: 1 })).first())
    const t = <TextChannel>(await client.channels.fetch("1045085555878273136"));
    t.send(`index.ts ${random}`)
})

export const onInteractionCreate = async (i: Interaction, c?) => {
    client = c
    console.log("onInteractionCreate")


    STARTED_AT = Date.now();
    console.log("Interaction started at.... ", STARTED_AT)
    console.time('interactionCreate')
    console.log("is this command a context menu", i.isMessageContextMenuCommand())
    console.log("is this command the same name AND context menu", i.isMessageContextMenuCommand() && i.commandName === replyFetcherCommand.name, i.channel)
    // console.log("is this command the same name OR context menu", i.isMessageContextMenuCommand() || i.commandName === replyFetcherCommand.name)
    if (!i.isMessageContextMenuCommand() || i.commandName !== replyFetcherCommand.name) console.log("command is not the one.")
    if (!i.isMessageContextMenuCommand() || i.commandName !== replyFetcherCommand.name) return;
    console.log("deferring reply...")
    // i.deferReply();
    await i.reply(`... index.ts ${random}`)

    // fetch entire channel history for first time. check db here if not already saved. update it otherwise. Fetch after the initial message if there is already data in db. Should not have [message]
    // try to finish installing top chunk of channel if not done already. (oldest in db and keep going up)
    // fetch from newest message in channel to the newest message in db.
    // after 55 seconds has passed since invoked time,   
    try {
        console.log("is looged in index", client.readyAt, c.readyAt)
        await saveNewestToOldest(i)
        await saveCursorAndAbove(i)
        await fetchNewestToNewest(i)
        console.log(await performDFS(i, client))

    } catch (error) {
        console.error(error)
        i.editReply("An error occurred")
    }
}

process.env.NODE_ENV !== "production" && client.on("interactionCreate", onInteractionCreate)



// find the oldest row then fetch messages before that.
async function saveNewestToOldest(i: MessageContextMenuCommandInteraction<CacheType>) {
    const [oldestRow] = await db
        .select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
        .from(messagesTable)
        .where(eq(messagesTable.channelId, i.channelId))
        .orderBy(asc(messagesTable.timestamp))
        .limit(1)

    const msgs = oldestRow ? await fetchMessages(i, oldestRow.id) : null

    if (!msgs?.length) {
        i.reply("Old messages already installed")
        return []
    }
    await db.insert(messagesTable).values(msgs);
    if (!msgs[msgs.length - 1].cursor) return i.editReply(`Finished installed old ${msgs.length} messages between ${msgs[msgs.length - 1].timestamp.toLocaleString()} and ${msgs[0].timestamp.toLocaleString()}.`)
    return i.editReply(`Only installed old ${msgs.length} messages between ${msgs[msgs.length - 1].timestamp.toLocaleString()} and ${msgs[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)
}

// 
async function saveCursorAndAbove(i: MessageContextMenuCommandInteraction<CacheType>) {
    const cursorRows = await db
        .select({ id: messagesTable.id, timestamp: messagesTable.timestamp, cursor: messagesTable.cursor, authorId: messagesTable.authorId, channelId: messagesTable.channelId })
        .from(messagesTable)
        .where(and(eq(messagesTable.channelId, i.channelId), eq(messagesTable.cursor, true)))
        .orderBy(desc(messagesTable.timestamp))
    console.log(cursorRows.length, "cursor rows length intial", findDuplicatesWithCounts(cursorRows))
    const msgs = new Map<string, MessagesTable>();
    for (const index in cursorRows) {
        // can either handle time limit or use last message cursor to determine. might not work due to fetched references
        // const fetched = cursorRows[Number(index) + 1]?.id ? await fetchMessages(i, cursorRows[index].id, cursorRows[Number(index) + 1].id)
        //     : await fetchMessages(i, cursorRows[index].id, await db.select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
        //         .from(messagesTable)
        //         .where(and(eq(messagesTable.channelId, i.channelId), lt(messagesTable.timestamp, cursorRows[index].timestamp)))
        //         .orderBy(desc(messagesTable.timestamp))[0])
        console.log(cursorRows[index].id, (await db.select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
            .from(messagesTable)
            .where(and(eq(messagesTable.channelId, i.channelId), lt(messagesTable.timestamp, cursorRows[index].timestamp)))
            .orderBy(desc(messagesTable.timestamp)))[0]?.id, "this is the id")
        const fetched = await fetchMessages(i, cursorRows[index].id, (await db.select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
            .from(messagesTable)
            .where(and(eq(messagesTable.channelId, i.channelId), lt(messagesTable.timestamp, cursorRows[index].timestamp)))
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
        i.editReply("No cursor messages at this time")
        return []
    }
    for (const c of cursorRows) console.log((await (<TextChannel>await client.channels.fetch(i.channelId)).messages.fetch(c.id)).url)


    await db.insert(messagesTable).values(Array.from(msgs.values())).onConflictDoUpdate({ target: messagesTable.id, set: { cursor: sql.raw(`excluded.${messagesTable.cursor.name}`) } })


    // should return after the loop is done and there is no msgs at all
    if (!Array.from(msgs.values()).find(m => m.cursor)) return i.editReply(`Finished installed cursor ${msgs.size} messages between ${Array.from(msgs.values())[msgs.size - 1].timestamp.toLocaleString()} and ${Array.from(msgs.values())[0].timestamp.toLocaleString()} (${cursorRows.length}).`)
    return i.editReply(`Only installed cursor ${msgs.size} messages between ${Array.from(msgs.values())[msgs.size - 1].timestamp.toLocaleString()} and ${Array.from(msgs.values())[0].timestamp.toLocaleString()} (${cursorRows.length}). Re-run the command to download the rest.`)

}

async function fetchNewestToNewest(i: MessageContextMenuCommandInteraction<CacheType>) {
    const [newestRow] = await db
        .select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
        .from(messagesTable)
        .where(eq(messagesTable.channelId, i.channelId))
        .orderBy(desc(messagesTable.timestamp))
        .limit(1)

    const msgs = await fetchMessages(i, null, newestRow ? newestRow.id : null)

    msgs?.forEach(m => console.log(m.id, m.timestamp.toLocaleString()))
    console.log(newestRow?.timestamp.toLocaleString(), "newest row")

    if (!msgs.length) {
        i.editReply("New messages already installed")
        return []
    }

    await db.insert(messagesTable).values(msgs).onConflictDoNothing()
    if (!msgs[msgs.length - 1].cursor) return i.editReply(`Finished installed new ${msgs.length} messages between ${msgs[msgs.length - 1].timestamp.toLocaleString()} and ${msgs[0].timestamp.toLocaleString()}.`)
    return i.editReply(`Only installed new ${msgs.length} messages between ${msgs[msgs.length - 1].timestamp.toLocaleString()} and ${msgs[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)
}

// newest to oldest. before & until not included
async function fetchMessages(i: MessageContextMenuCommandInteraction<CacheType>, beforeId?: string, untilId?: string): Promise<MessagesTable[]> {
    console.log(beforeId, untilId, "this is the id")
    let coll: Collection<string, Message>;
    let messages = [];
    const referencedMessages: MessageReference[] = [];

    if (!beforeId) coll = await (<TextChannel>await client.channels.fetch(i.channelId)).messages.fetch({ limit: 1 })

    else coll = await (<TextChannel>await client.channels.fetch(i.channelId)).messages.fetch({ limit: 100, before: beforeId })
    beforeId = coll.last()?.id;
    const interval = setInterval(() => {
        i.editReply(`Downloading ${messages.length} messages between ${messages[messages.length - 1].createdAt.toLocaleString()} and ${messages[0].createdAt.toLocaleString()}... + ${new Date().toLocaleString()}`)
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
        coll = await (<TextChannel>await client.channels.fetch(i.channelId)).messages.fetch({ limit: 100, before: beforeId })


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
