import "../src/database"
import { TEST_SERVER } from "../src";
import mongoose from "mongoose";
import { verifyKey, InteractionResponseType, InteractionType, InteractionResponseFlags } from "discord-interactions";
import { APIInteractionResponse } from "discord.js";
import { RESTPostAPIInteractionCallbackJSONBody } from "discord-api-types/v10";
import { verify } from "../src/verify";

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
    await verify(req)
console.log("body", req.body)
    const message = JSON.parse(req.body) as { type: InteractionType, data: APIInteractionResponse };
    if (message.type === InteractionType.APPLICATION_COMMAND)
        console.log(message)
    return new Response(JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: 'Hello world',
        }
    }))
    if (message.type === InteractionType.PING)
        console.log("ping", message)
    return new Response(JSON.stringify({
        type: PONG,
    }))
}

