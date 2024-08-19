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
    const query = sql`
    WITH RECURSIVE RepliesCTE AS (
        SELECT
            id,
            content,
            author_id AS authorId,
            timestamp,
            reference
        FROM
            messages_table
        WHERE
            id = ${i.targetId}

        UNION ALL

        SELECT
            m.id,
            m.content,
            m.author_id AS authorId,
            m.timestamp,
            m.reference
        FROM
            messages_table m
        INNER JOIN
            RepliesCTE r
        ON
            m.reference = r.id
    )
    SELECT
        id,
        content,
        authorId,
        timestamp,
        reference
    FROM
        RepliesCTE
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
    const embed = new EmbedBuilder()
        .setTitle('Message Replies')
        .setColor('#0099ff');

    // Recursive function to build the description
    function buildDescription(node: any, indentLevel: number): string {
        const indent = ' '.repeat(indentLevel * 2); // Adjust indent size
        const arrow = '➡️'; // Arrow emoji
        let description = `${indent}${arrow} **Message ID**: ${node.id}\n${indent}**Content**: ${node.content}\n\n`;

        // Recursively add replies
        for (const reply of node.replies) {
            description += buildDescription(reply, indentLevel + 1);
        }

        return description;
    }

    // Start building the description from the root nodes
    let description = '';
    for (const rootNode of replies) {
        description += buildDescription(rootNode, 0);
    }

    embed.setDescription(description);

    return embed;

    // i.reply({
    //     embeds: [e]
    // })

}



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
