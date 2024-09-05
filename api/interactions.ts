//  import "../src/database"
import { onInteractionCreate, sleep, TEST_SERVER } from "../src";
// import mongoose from "mongoose";
import { verifyKey, InteractionResponseType, InteractionType, InteractionResponseFlags } from "discord-interactions";
import { verify } from "../src/verify";
import { APIInteractionResponse, ApplicationCommand, ApplicationCommandType, AutocompleteInteraction, BaseInteraction, ButtonInteraction, ChannelSelectMenuInteraction, ChatInputCommandInteraction, Client, ComponentType, Events, GatewayIntentBits, MentionableSelectMenuInteraction, MessageContextMenuCommandInteraction, ModalSubmitInteraction, Partials, RoleSelectMenuInteraction, StringSelectMenuInteraction, TextChannel, UserContextMenuCommandInteraction, UserSelectMenuInteraction } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
// console.log("Logging it in")
//if (!client.isReady())
//    client.login(process.env.BOT_TOKEN)
console.log("interactions.ts file started", client.isReady())
let random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

client.on("ready", async () => {
 console.log("interactions.ts: is logged in", client.readyAt.toLocaleString())
 //   const t = await <TextChannel>client.channels.cache.get("1045085555878273136");
  //  client.guilds.cache.forEach(g => console.log(g.name));

  //  t.send(`interaction.ts ${random}`)
})

export async function GET(req: Request) {
    const signature = req.headers.get('X-Signature-Ed25519');
    const timestamp = req.headers.get('X-Signature-Timestamp');
    const isValidRequest = await verifyKey(await req.text(), signature, timestamp, 'MY_CLIENT_PUBLIC_KEY');
    if (!isValidRequest) {
        return new Response("Bad request signature", { status: 400, })
    }
    // mongoose.connection.close();
    return new Response(`Hello from ${process.env.VERCEL_REGION} ${TEST_SERVER}`);
}


export async function POST(req: Request) {
    console.log("POST request is bot ready", client.readyAt)
    if (!client.isReady()) {
        console.log("Logging in the bot due to POST")
        client.login(process.env.BOT_TOKEN)
    }
    random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    console.time("start of function")
    //  console.log(mongoose)
    //  console.log(mongoose.connection)
    const txt = await req.text()
    await verify(req, txt)
    console.log("body", req.body)
    console.log(req)
    console.log("txt", txt)
    const message = JSON.parse(txt) as { type: InteractionType, data: APIInteractionResponse };



    if (message.type === InteractionType.APPLICATION_COMMAND) {


        console.log("the command is an applicaiton responding", message)
        console.log("resoonding with type", InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE)

        //@ts-ignore
        // const i = new Test(new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] }), { ...message.data, user: message?.data?.member?.user })

        const i = new Test(client, message)
        console.log("this is I", i)
        // console.log("this is i name", i.commandName)

        i.isCommand() && console.log("command name", i, "channel", i.channel)
        console.log("deferring reply...")
        // i.deferReply();
        await i.reply(`... interactions.ts  ${random}`)
        console.timeEnd("start of function")




        console.log("is looged in interaction", client.readyAt)

        await onInteractionCreate(i, client)


    }

    if (message.type === InteractionType.PING) {
        console.log("ping", message)

        // return new Response(JSON.stringify({
        //     type: InteractionResponseType.PONG,
        // }))

        return Response.json({ type: InteractionResponseType.PONG, })
    }
}


class Test extends MessageContextMenuCommandInteraction {
    constructor(c, d) {
        super(c, d)
    }
}


