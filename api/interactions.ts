//  import "../src/database"
import { onInteractionCreate, sleep, TEST_SERVER } from "../src";
// import mongoose from "mongoose";
import { verifyKey, InteractionResponseType, InteractionType, InteractionResponseFlags } from "discord-interactions";
import { verify } from "../src/verify";
import { APIInteractionResponse, ApplicationCommand, ApplicationCommandType, AutocompleteInteraction, BaseInteraction, ButtonInteraction, ChannelSelectMenuInteraction, ChatInputCommandInteraction, Client, ComponentType, Events, GatewayIntentBits, MentionableSelectMenuInteraction, MessageContextMenuCommandInteraction, ModalSubmitInteraction, Partials, RoleSelectMenuInteraction, StringSelectMenuInteraction, UserContextMenuCommandInteraction, UserSelectMenuInteraction } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] })
client.login(process.env.BOT_TOKEN)

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
    //  console.log(mongoose)
    //  console.log(mongoose.connection)
    const txt = await req.text()
    await verify(req, txt)
    console.log("body", req.body)
    console.log(req)
    console.log("txt", txt)
    const message = JSON.parse(txt) as { type: InteractionType, data: APIInteractionResponse };



    if (message.type === InteractionType.APPLICATION_COMMAND) {
        client.login(process.env.BOT_TOKEN)
        console.log("the command is an applicaiton responding", message)
        console.log("resoonding with type", InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE)

        //@ts-ignore
        // const i = new Test(new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] }), { ...message.data, user: message?.data?.member?.user })

        const i = new Test(client, message)
        console.log("this is I", i)
        // console.log("this is i name", i.commandName)

        i.isCommand() && console.log("command name", i, "channel", i.channel)
        console.log("deferring reply...")
        i.deferReply();

        await sleep(2000)

        console.log("is looged in interaction", client.readyAt)

        await onInteractionCreate(i, client)



        // return Response.json({
        //     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        //     data: {
        //         content: 'Hello world',
        //     }
        // })
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


