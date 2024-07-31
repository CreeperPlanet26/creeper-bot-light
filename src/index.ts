import "dotenv/config";
import { promises as fs } from 'fs';
import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import { replyFetcherCommand } from "./replyFetcherCommand";
// import { db } from "./db";
import { messagesTable } from "./schema";
import { and, eq, max, sql } from "drizzle-orm";
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
})

client.on("interactionCreate", async (i) => {
    console.time('interactionCreate')
    if (!i.isMessageContextMenuCommand() || i.commandName !== replyFetcherCommand.name) return;
    i.deferReply();

    // const [m] = await db.select({ timestamp: max(messagesTable.timestamp) }).from(messagesTable).where(
    //     eq(messagesTable.channelId, i.channel.id)
    // )

    // console.log(m)
    // console.timeEnd('interactionCreate')

    // const result = await sql.raw(
    //     `
    //     SELECT *
    //     FROM messages_table
    //     WHERE timestamp = (
    //         SELECT MAX(timestamp)
    //         FROM messages_table
    //     )
    //     LIMIT 1;
    //     `
    // );
    // const document = await db.execute(result)
    // console.log('Document with Latest Date:', document);


    // fetch entire channel history for first time. check db here if not already saved. update it otherwise. Fetch after the initial message if there is already data in db. Should not have [message]
    try {
        let message = (await i.channel.messages.fetch({ limit: 1 })).first();
        let messages = [{
            content: message.content,
            id: message.id,
            channelId: message.channelId,
            timestamp: message.createdAt,
            reference: message.reference?.messageId
        }];

        console.log("the original message", message)

        const interval = setInterval(() => {
            i.editReply(`Downloading ${messages.length} messages...`)
        }, 20000)

        while (message) {
            console.log(messages.length)
            const coll = await i.channel.messages.fetch({ limit: 100, before: message.id })
            coll.forEach(m => messages.push({
                content: m.content,
                id: m.id,
                channelId: m.channelId,
                timestamp: m.createdAt,
                reference: m.reference?.messageId
            }));
            message = coll.size > 0 ? coll.last() : null;
        }

        clearInterval(interval);
        i.editReply(`Finished installing ${messages.length} messages`)
        console.timeEnd('interactionCreate')

        console.log("first message", messages[0])
        console.log("last message", messages[messages.length - 1])
        await db.insert(messagesTable).values(messages)
        await fs.writeFile(`${__dirname}/test.json`, JSON.stringify(messages, null, 2))
    } catch (error) {
        console.error(error)
        i.editReply("An error occurred")
    }
})

// // Register Slash Commands
// client.application.commands.set([countingCommand, fortniteCommand, avatarCommand, replyFetcherCommand])
// client.application.commands.create(countingCommand)
// client.application.commands.create(fortniteCommand)
// client.application.commands.create(avatarCommand)
// client.application.commands.create(replyFetcherCommand)