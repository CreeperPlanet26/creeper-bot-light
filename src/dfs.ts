import { MessageContextMenuCommandInteraction, CacheType, Message, EmbedBuilder, Client, TextChannel } from "discord.js";
import { db } from ".";
import { MessagesTable, messagesTable } from "./schema";
import { desc, eq, sql } from "drizzle-orm";

export async function performDFS(i: MessageContextMenuCommandInteraction<CacheType>, client: Client) {
    console.time("DFS");
    // const results = [];
    // const stack: string[] = [i.targetId]; // Stack to process messages
    // const visited = new Set<string>(); // Track visited message IDs to avoid cycles

    // while (stack.length > 0) {
    //     const currentId = stack.pop();
    //     if (currentId && !visited.has(currentId)) {
    //         visited.add(currentId);

    //         // Fetch replies to the current message
    //         const replies = await db
    //             .select({
    //                 id: messagesTable.id,
    //                 content: messagesTable.content,
    //                 authorId: messagesTable.authorId,
    //                 timestamp: messagesTable.timestamp,
    //                 reference: messagesTable.reference,
    //             })
    //             .from(messagesTable)
    //             .where(eq(messagesTable.reference, currentId))
    //             .orderBy(desc(messagesTable.timestamp)); // Order replies from newest to oldest

    //         // Add replies to results and stack
    //         for (const reply of replies) {
    //             if (!visited.has(reply.id)) {
    //                 results.push(reply);
    //                 stack.push(reply.id); // Push replies to stack for further processing
    //             }
    //         }
    //     }
    // }


    // return results;
    //     const query = sql`
    //     WITH RECURSIVE RepliesCTE AS (
    //         SELECT
    //             id,
    //             content,
    //             author_id AS authorId,
    //             channel_id AS channelId,
    //             timestamp,
    //             reference
    //         FROM
    //             messages_table
    //         WHERE
    //             id = ${i.targetId}

    //         UNION ALL

    //         SELECT
    //             m.id,
    //             m.content,
    //             m.author_id AS authorId,
    //             m.channel_id AS channelId,
    //             m.timestamp,
    //             m.reference
    //         FROM
    //             messages_table m
    //         INNER JOIN
    //             RepliesCTE r
    //         ON
    //             m.reference = r.id
    //     )
    //     SELECT
    //         id,
    //         content,
    //         authorId,
    //         channelId,
    //         timestamp,
    //         reference
    //     FROM
    //         RepliesCTE
    //     ORDER BY
    //         timestamp DESC;
    // `;






    //     const query = sql`
    //     WITH RECURSIVE RepliesCTE AS (
    //         -- Base case: Select the initial message
    //         SELECT
    //             id,
    //             content,
    //             author_id AS authorId,
    //             timestamp,
    //             reference,
    //             channel_id AS channelID
    //         FROM
    //             messages_table
    //         WHERE
    //             id = ${i.targetId}

    //         UNION ALL

    //         -- Recursive case: Select replies to messages already included
    //         SELECT
    //             m.id,
    //             m.content,
    //             m.author_id AS authorId,
    //             m.timestamp,
    //             m.reference,
    //             m.channel_id AS channelID
    //         FROM
    //             messages_table m
    //         INNER JOIN
    //             RepliesCTE r
    //         ON
    //             m.reference = r.id
    //     ),
    //     AncestorsCTE AS (
    //         -- Base case: Select the initial message
    //         SELECT
    //             id,
    //             content,
    //             author_id AS authorId,
    //             timestamp,
    //             reference,
    //             channel_id AS channelID
    //         FROM
    //             messages_table
    //         WHERE
    //             id = ${i.targetId}

    //         UNION ALL

    //         -- Recursive case: Select parent messages to messages already included
    //         SELECT
    //             m.id,
    //             m.content,
    //             m.author_id AS authorId,
    //             m.timestamp,
    //             m.reference,
    //             m.channel_id AS channelID
    //         FROM
    //             messages_table m
    //         INNER JOIN
    //             AncestorsCTE a
    //         ON
    //             m.id = a.reference
    //     )
    //     SELECT DISTINCT
    //         id,
    //         content,
    //         authorId,
    //         timestamp,
    //         reference,
    //         channelID
    //     FROM
    //         RepliesCTE
    //     UNION
    //     SELECT DISTINCT
    //         id,
    //         content,
    //         authorId,
    //         timestamp,
    //         reference,
    //         channelID
    //     FROM
    //         AncestorsCTE
    //     WHERE
    //         content LIKE '%' || ${i.targetId} || '%'  -- Include messages containing the target ID in content
    //         AND authorId NOT IN ("948700837373440061", "678712272209575946")           -- Exclude messages from author IDs 123 and 456
    //     ORDER BY
    //         timestamp DESC;                         -- Order results by timestamp
    // `;

    async function columnExists(columnName: string, tableName: string): Promise<boolean> {
        const query = sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = ${tableName}
          AND column_name = ${columnName}
      )
    `;

        const result = await db.execute(query);
        return result.rows[0] ? true : false;
    }

    const authorIdColumnExists = await columnExists('author_id', 'messages_table');

    const query = sql`
WITH RECURSIVE RepliesCTE AS (
  SELECT
    id,
    content,
    ${authorIdColumnExists ? sql`author_id AS authorId` : sql`NULL AS authorId`} ,
    timestamp,
    reference,
    channel_id AS channelID
  FROM
    messages_table
  WHERE
    id = ${i.targetId}

  UNION ALL

  SELECT
    m.id,
    m.content,
    ${authorIdColumnExists ? sql`m.author_id AS authorId` : sql`NULL AS authorId`} ,
    m.timestamp,
    m.reference,
    m.channel_id AS channelID
  FROM
    messages_table m
  INNER JOIN
    RepliesCTE r
  ON
    m.reference = r.id
),
AncestorsCTE AS (
  SELECT
    id,
    content,
    ${authorIdColumnExists ? sql`author_id AS authorId` : sql`NULL AS authorId`} ,
    timestamp,
    reference,
    channel_id AS channelID
  FROM
    messages_table
  WHERE
    id = ${i.targetId}

  UNION ALL

  SELECT
    m.id,
    m.content,
    ${authorIdColumnExists ? sql`m.author_id AS authorId` : sql`NULL AS authorId`} ,
    m.timestamp,
    m.reference,
    m.channel_id AS channelID
  FROM
    messages_table m
  INNER JOIN
    AncestorsCTE a
  ON
    m.id = a.reference
)
SELECT DISTINCT
  id,
  content,
  ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
  timestamp,
  reference,
  channelID
FROM
  RepliesCTE
UNION
SELECT DISTINCT
  id,
  content,
  ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
  timestamp,
  reference,
  channelID
FROM
  AncestorsCTE
${authorIdColumnExists ? sql`WHERE authorId NOT IN ('948700837373440061', '678712272209575946')` : sql``}
ORDER BY
  timestamp DESC;
`;



    // Execute the query with the initial message ID
    const { rows } = await db.execute(query)
    const full = buildNestedReplies(rows)
    console.timeEnd("DFS");
    console.log(full)


    // const e = new EmbedBuilder()
    //     .setTitle(`DFS for (${i.targetMessage.content})[${(await i.targetMessage.fetch()).url}]`)
    //     .setColor('#2186DB')
    //     .setTimestamp();

    // let d
    // const channels = new Map<string, TextChannel>()
    // for (const r of full) {
    //     for (const m of r) {

    //     const c = await client.channels.fetch(m.channelId) as TextChannel
    //     channels.set(m.channelId, c)
    //     d += `([${m.timestamp}] ${m.authomId}: ${m.content})[${(await channels.get(c.id).messages.fetch(m.id)).url}]\n`
    //     }
    // }

    // e.setDescription(d)
    const e = new EmbedBuilder()
        .setTitle('Message Replies')
        .setColor('#0099ff');

    // Recursive function to build the description
    // async function buildDescription(node: any, indentLevel: number): Promise<string> {
    //     const indent = '➡️'.repeat(indentLevel); // Adjust indent size
    //     const arrow = ' '; // Arrow emoji
    //     console.log(node)
    //     const c = await client.channels.fetch(node.channelid) as TextChannel
    //     let description = `${indent}${arrow} ${i.targetId === node.id ? `**(This Message)**` : ""} ${indent}[**${(await client.users.fetch(node.authorid)).displayName}**](${(await c.messages.fetch(node.id)).url}): ${node.content}\n\n`;

    //     // Recursively add replies
    //     for (const reply of node.replies) {
    //         description += await buildDescription(reply, indentLevel + 1);
    //     }

    //     return description;
    // }

    // // Start building the description from the root nodes
    // let description = '';
    // for (const rootNode of full) {
    //     description += await buildDescription(rootNode, 0);
    // }
    // console.log(description)

    // e.setDescription(description);

    // // return embed;

    // i.channel.send({
    //     embeds: [e]
    // })



    async function buildDescription(node: any, indentLevel: number): Promise<string> {
        // Create a dashed line for the current indent level
        const indent = '-'.repeat(indentLevel * 2); // Increase or decrease the multiplier for more/less indentation
        const arrow = ' '; // Arrow or space for separator

        // Fetch channel and user information
        const c = await client.channels.fetch(node.channelid) as TextChannel;
        const user = await client.users.fetch(node.authorid);
        const message = await c.messages.fetch(node.id);

        // Build the description for the current node
        let description = `${indent}${arrow} ${i.targetId === node.id ? `**(This Message)**` : ""} [**${user.displayName}**](${message.url}): ${node.content}\n\n`;

        // Recursively add replies
        for (const reply of node.replies) {
            description += await buildDescription(reply, indentLevel + 1);
        }

        return description;
    }

    // Start building the description from the root nodes
    let description = '';
    for (const rootNode of full) {
        description += await buildDescription(rootNode, 0);
    }

    // Create and send the embed
    e
        .setDescription(description);

    // Send the embed to the channel
    i.channel.send({
        embeds: [e]
    });


}



// import { EmbedBuilder } from 'discord.js';

// // Function to build a description string with nested replies
// function buildDescription(node: any, indentLevel: number): string {
//     const indent = ' '.repeat(indentLevel * 2); // Adjust indent size for each layer
//     const arrow = '➡️'; // Arrow emoji
//     let description = `${indent}${arrow} **Message ID**: ${node.id}\n${indent}**Content**: ${node.content}\n\n`;

//     // Recursively add replies
//     for (const reply of node.replies) {
//         description += buildDescription(reply, indentLevel + 1);
//     }

//     return description;
// }

// // Function to send an embed with nested replies
// async function sendRepliesEmbed(i: any, full: any[]) {
//     const e = new EmbedBuilder()
//         .setTitle('Message Replies')
//         .setColor('#0099ff');

//     // Start building the description from the root nodes
//     let description = '';
//     for (const rootNode of full) {
//         description += buildDescription(rootNode, 0);
//     }

//     e.setDescription(description);

//     // Send the embed to the channel
//     await i.channel.send({
//         embeds: [e]
//     });
// }

// // Example usage (assuming `i` is your interaction and `full` is your nested replies array)
// await sendRepliesEmbed(i, full);




// Function to build nested replies
function buildNestedReplies(rows: any[]): any[] {
    const idToNodeMap = new Map<string, any>();

    // Create the nodes and map them by ID
    rows.forEach(row => {
        // Initialize the node with an empty replies array
        idToNodeMap.set(row.id, { ...row, replies: [] });
    });

    const result: any[] = [];

    // Build the hierarchy
    idToNodeMap.forEach(node => {
        if (node.reference) {
            // Attach node to its parent's replies
            const parent = idToNodeMap.get(node.reference);
            if (parent) {
                parent.replies.push(node);
            }
        } else {
            // If there's no reference, it's a top-level message
            result.push(node);
        }
    });

    return result;
}
