import { verifyKey } from "discord-interactions";

export async function verify(req: Request, txt: string) {
    console.log("this is the text", txt)
    const signature = req.headers.get('X-Signature-Ed25519');
    const timestamp = req.headers.get('X-Signature-Timestamp');
    const isValidRequest = await verifyKey(txt, signature, timestamp, process.env.PUBLIC_KEY);

    console.log("we were able to await. the request is valid.")
    if (!isValidRequest) {
        return new Response("Bad request signature", { status: 400, })
    }
}
