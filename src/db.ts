import "dotenv/config";
// import { drizzle } from "drizzle-orm/neon-http";
import { drizzle } from "@xata.io/drizzle";
import { neon } from "@neondatabase/serverless";
import { getXataClient } from "./xata";


// const sql = neon(process.env.DATABASE_URI!);
// export const db = drizzle(sql);

const xata = getXataClient();
export const db = drizzle(xata);


