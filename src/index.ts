import "dotenv/config";
import { promises as fs } from 'fs';
import { Client, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { replyFetcherCommand } from "./replyFetcherCommand";
// import { db } from "./db";
import { messagesTable } from "./schema";
import { and, asc, desc, eq, max, sql } from "drizzle-orm";
import { Client as PgClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

export const TEST_SERVER = "640262033329356822";

// const client = new Client({ restTimeOffset: 75, intents: new Intents(["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS",]) });
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });

// if (process.env.NODE_ENV !== "production") client.login(process.env.DEV_BOT_TOKEN);




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
    console.time('interactionCreate')
    if (!i.isMessageContextMenuCommand() || i.commandName !== replyFetcherCommand.name) return;
    i.deferReply();

    let timeLimitReached = false;
    setTimeout(() => { timeLimitReached = true; }, 50000)

    // oldest message in db
    const [oldestRow] = await db
        .select({ id: messagesTable.id, timestamp: messagesTable.timestamp })
        .from(messagesTable)
        .where(eq(messagesTable.channelId, i.channel.id))
        .orderBy(asc(messagesTable.timestamp))
        .limit(1)

    console.log("oldestRow", oldestRow)



    // console.timeEnd('interactionCreate')
    // fetch entire channel history for first time. check db here if not already saved. update it otherwise. Fetch after the initial message if there is already data in db. Should not have [message]
    // try to finish installing top chunk of channel if not done already. (oldest in db and keep going up)
    // fetch from newest message in channel to the newest message in db.
    // after 55 seconds has passed since invoked time,   
    try {
        // let message = oldestRow?.id ? (await i.channel.messages.fetch(oldestRow.id)) : (await i.channel.messages.fetch({ limit: 1 })).first();
        // let messages = oldestRow?.id ? [] : [{
        //     content: message.content,
        //     id: message.id,
        //     channelId: message.channelId,
        //     timestamp: message.createdAt,
        //     reference: message.reference?.messageId,
        //     cursor: false
        // }];



        // while (message && !timeLimitReached) {
        //     console.log(messages.length)
        //     const coll = await i.channel.messages.fetch({ limit: 100, before: message.id })
        //     coll.forEach(m => messages.push({
        //         content: m.content,
        //         id: m.id,
        //         channelId: m.channelId,
        //         timestamp: m.createdAt,
        //         reference: m.reference?.messageId,
        //         cursor: false
        //     }));
        //     message = coll.size > 0 ? coll.last() : null;
        // }
        // const interval = setInterval(() => {
        //     i.editReply(`Downloading ${messages.length} messages before ${messages[messages.length - 1].timestamp.toLocaleString()}...`)
        // }, 20000)
        const oldMessages = await fetchMessages(oldestRow, timeLimitReached, i)

        console.timeEnd('interactionCreate')



        if (oldMessages.length > 0 && timeLimitReached) {
            oldMessages[0].cursor = true;
            await db.insert(messagesTable).values(oldMessages)
            i.channel.send("limited reached while fetching old messages");
            return i.channel.send(`Only installed old ${oldMessages.length} messages between [${oldMessages[oldMessages.length - 1].timestamp.toLocaleString()}](${(await i.channel.messages.fetch(oldMessages[oldMessages.length - 1].id)).url} and ${oldMessages[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)
        }

        await db.update(messagesTable).set({ cursor: true }).where(and(eq(messagesTable.cursor, true), eq(messagesTable.channelId, i.channel.id)))
        oldMessages.length > 0 && await db.insert(messagesTable).values(oldMessages)
        oldMessages.length > 0 && i.channel.send(`Finished installed old ${oldMessages.length} messages between ${oldMessages[oldMessages.length - 1].timestamp.toLocaleString()} and ${oldMessages[0].timestamp.toLocaleString()}.`)

        // then fetch from cursor to up to newest message in db
        const [cursorRow] = await db
            .select({ id: messagesTable.id })
            .from(messagesTable)
            .where(and(eq(messagesTable.channelId, i.channel.id), eq(messagesTable.cursor, true)))
            .limit(1)

        if (cursorRow?.id) {
            const [{ id: cursorNewestMessageId }] = await db
                .select({ id: messagesTable.id })
                .from(messagesTable)
                .where(eq(messagesTable.channelId, i.channel.id))
                .orderBy(desc(messagesTable.timestamp))
                .limit(1)

            const cursorMessages = await fetchMessages(cursorRow, timeLimitReached, i, cursorNewestMessageId);
            if (timeLimitReached) {
                cursorMessages[0].cursor = true;
                cursorMessages.length > 0 && await db.insert(messagesTable).values(cursorMessages)
                i.channel.send("limited reached while fetching cursor messages");
                return i.channel.send(`Only installed cursor ${cursorMessages.length} messages between ${cursorMessages[cursorMessages.length - 1].timestamp.toLocaleString()} and ${cursorMessages[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)
            }

            await db.update(messagesTable).set({ cursor: false }).where(eq(messagesTable.cursor, true))
            cursorMessages.length > 0 && await db.insert(messagesTable).values(cursorMessages)
            cursorMessages.length > 0 && i.channel.send(`Finished installed cursor ${cursorMessages.length} messages between ${cursorMessages[cursorMessages.length - 1].timestamp.toLocaleString()} and ${cursorMessages[0].timestamp.toLocaleString()}.`)
        }

        // then fetch from newest message in channel up to newest message in db
        const [newestRow] = await db
            .select({ id: messagesTable.id })
            .from(messagesTable)
            .where(eq(messagesTable.channelId, i.channel.id))
            .orderBy(desc(messagesTable.timestamp))
            .limit(1)

        const newMessages = await fetchMessages(newestRow, timeLimitReached, i, null, true);
        if (newMessages.length > 0 && timeLimitReached) {
            newMessages[0].cursor = true;
            await db.insert(messagesTable).values(newMessages)
            i.channel.send("limited reached while fetching new messages");
            return i.channel.send(`Only installed new ${newMessages.length} messages between ${newMessages[newMessages.length - 1].timestamp.toLocaleString()} and ${newMessages[0].timestamp.toLocaleString()}. Re-run the command to download the rest.`)

        }
        console.log("new messages", newMessages.length)
        await db.update(messagesTable).set({ cursor: false }).where(eq(messagesTable.cursor, true))
        newMessages.length > 0 && await db.insert(messagesTable).values(newMessages)
        newMessages.length > 0 && i.channel.send(`Finished installed new ${newMessages.length} messages between ${newMessages[newMessages.length - 1].timestamp.toLocaleString()} and ${newMessages[0].timestamp.toLocaleString()}.`)


    } catch (error) {
        console.error(error)
        i.editReply("An error occurred")
    }
})


async function fetchMessages(row, timeLimitReached, i, cursorNewestMessageId?, fetchTillNewest?) {
    console.log("should fetch till newest", fetchTillNewest)
    const interval = setInterval(() => {
        i.editReply(`Downloading ${messages.length} messages between ${messages[messages.length - 1].timestamp.toLocaleString()} and ${messages[0].timestamp.toLocaleString()}...`)
    }, 20000)
    let message: Message;
    if (fetchTillNewest) message = (await i.channel.messages.fetch({ limit: 1 })).first();
    else if (row?.id) message = await i.channel.messages.fetch(row.id)
    else (await i.channel.messages.fetch({ limit: 1 })).first();

    console.log("message first time", message.createdAt.toLocaleString())
    // if (message === row.id) return []
    let messages = row?.id ? [] : [{
        content: message.content,
        id: message.id,
        channelId: message.channelId,
        timestamp: message.createdAt,
        reference: message.reference?.messageId,
        cursor: false
    }];

    while (message && !timeLimitReached) {
        console.log(messages.length, "array", message.createdAt.toLocaleString())

        console.log("going to fetch messages before", message.createdAt.toLocaleString())
        const coll = await i.channel.messages.fetch({ limit: 100, before: message.id })
        console.log("message given to us", coll.last()?.createdAt.toLocaleString(), coll.size)

        if (!coll.size) {
            // message = null;
            clearInterval(interval);
            return [];
        }
        if (coll.last() === cursorNewestMessageId || coll.last() === row.id) {
            // message = null;
            clearInterval(interval);
            return []
        }
        if (fetchTillNewest && coll.has(row.id)) {
            for (const [_, m] of coll) {
                console.log(m.createdAt.toLocaleString())
                if (m.id === row.id) {
                    console.log("found row id", m.createdAt.toLocaleString())
                    console.log(messages.length)

                    clearInterval(interval);
                    return messages
                }
                messages.push({
                    content: m.content,
                    id: m.id,
                    channelId: m.channelId,
                    timestamp: m.createdAt,
                    reference: m.reference?.messageId,
                    cursor: false
                })
            }
        }
        coll.forEach(m => messages.push({
            content: m.content,
            id: m.id,
            channelId: m.channelId,
            timestamp: m.createdAt,
            reference: m.reference?.messageId,
            cursor: false
        }));
        message = coll.size > 0 ? coll.last() : null;
    }

    clearInterval(interval);
    return messages;
}

// // Register Slash Commands
// client.application.commands.set([countingCommand, fortniteCommand, avatarCommand, replyFetcherCommand])
// client.application.commands.create(countingCommand)
// client.application.commands.create(fortniteCommand)
// client.application.commands.create(avatarCommand)
// client.application.commands.create(replyFetcherCommand)