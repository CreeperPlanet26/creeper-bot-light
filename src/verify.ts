import { verifyKey } from "discord-interactions";

import nacl from "tweetnacl"

export async function verify(req: Request, txt: string) {
    console.log("this is the text", txt)
//    const signature = req.headers.get('X-Signature-Ed25519');
//    const timestamp = req.headers.get('X-Signature-Timestamp');
//    const isValidRequest = await verifyKey(txt, signature, timestamp, process.env.PUBLIC_KEY);

//    console.log("we were able to await. the request is valid.")
//    if (!isValidRequest) {
 //       return new Response("Bad request signature", { status: 400, })
 //   }




    
// Your public key can be found on your application in the Developer Portal
const PUBLIC_KEY = process.env.PUBLIC_KEY

const signature = req.headers.get("X-Signature-Ed25519");
const timestamp = req.headers.get("X-Signature-Timestamp");
// const body = req.rawBody; // rawBody is expected to be a string, not raw bytes

const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + txt),
    Buffer.from(signature, "hex"),
    Buffer.from(PUBLIC_KEY, "hex")
);

     console.log("verifed?", isVerified)

if (!isVerified) {
    throw new Error("not verified")
     return new Response("Bad request signature", { status: 400, })
} 
}
