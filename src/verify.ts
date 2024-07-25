import { verifyKey } from "discord-interactions";

export async function verify(req: Request, txt: string) {
    const signature = req.headers.get('X-Signature-Ed25519');
    const timestamp = req.headers.get('X-Signature-Timestamp');
    const isValidRequest = await verifyKey(txt, signature, timestamp, process.env.PUBLIC_KEY);
    if (!isValidRequest) {
        return new Response("Bad request signature", { status: 400, })
    }
}
