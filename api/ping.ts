import { InteractionResponseType, InteractionType } from "discord.js";
import { verify } from "../src/verify";

export async function GET(req: Request) {
    await verify(...req)

    const message = await req.json() as { type: InteractionType };
    if (message.type === InteractionType.Ping)
        console.log("ping", message)
    return new Response(JSON.stringify({
        type: InteractionResponseType.Pong,
    }))
}
