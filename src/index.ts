import { Client } from "discord.js";

export const TEST_SERVER = "640262033329356822";

// const client = new Client({ restTimeOffset: 75, intents: new Intents(["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS",]) });

// if (process.env.NODE_ENV !== "production") client.login(process.env.DEV_BOT_TOKEN);




// client.login(process.env.NODE_ENV == 'production' ? process.env.BOT_TOKEN : process.env.DEV_BOT_TOKEN);

// client.application.commands.fetch().then(console.log);

// // (await client.guilds.fetch(TEST_SERVER))?.commands.set([replyFetcherCommand]);

// // Register Slash Commands
// client.application.commands.set([countingCommand, fortniteCommand, avatarCommand, replyFetcherCommand])
// client.application.commands.create(countingCommand)
// client.application.commands.create(fortniteCommand)
// client.application.commands.create(avatarCommand)
// client.application.commands.create(replyFetcherCommand)