import { MessageContextMenuCommandInteraction, CacheType, Message, EmbedBuilder, Client, TextChannel } from "discord.js";
import { db } from ".";
import { MessagesTable, messagesTable } from "./schema";
import { desc, eq, sql } from "drizzle-orm";

export async function performDFS(i: MessageContextMenuCommandInteraction<CacheType>, client: Client) {
  console.time("Total");
  console.time("Query")



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


  //   const query = sql`WITH RECURSIVE RepliesCTE AS (
  //   SELECT
  //     id,
  //     content,
  //     ${authorIdColumnExists ? sql`author_id AS authorId` : sql`NULL AS authorId`} ,
  //     timestamp,
  //     reference,
  //     channel_id AS channelID
  //   FROM
  //     messages_table
  //   WHERE
  //     id = ${i.targetId}

  //   UNION ALL

  //   SELECT
  //     m.id,
  //     m.content,
  //     ${authorIdColumnExists ? sql`m.author_id AS authorId` : sql`NULL AS authorId`} ,
  //     m.timestamp,
  //     m.reference,
  //     m.channel_id AS channelID
  //   FROM
  //     messages_table m
  //   INNER JOIN
  //     RepliesCTE r
  //   ON
  //     m.reference = r.id
  // ),
  // AncestorsCTE AS (
  //   SELECT
  //     id,
  //     content,
  //     ${authorIdColumnExists ? sql`author_id AS authorId` : sql`NULL AS authorId`} ,
  //     timestamp,
  //     reference,
  //     channel_id AS channelID
  //   FROM
  //     messages_table
  //   WHERE
  //     id = ${i.targetId}

  //   UNION ALL

  //   SELECT
  //     m.id,
  //     m.content,
  //     ${authorIdColumnExists ? sql`m.author_id AS authorId` : sql`NULL AS authorId`} ,
  //     m.timestamp,
  //     m.reference,
  //     m.channel_id AS channelID
  //   FROM
  //     messages_table m
  //   INNER JOIN
  //     AncestorsCTE a
  //   ON
  //     m.id = a.reference
  // ),
  // IndirectReferences AS (
  //   SELECT DISTINCT
  //     m.id,
  //     m.content,
  //     ${authorIdColumnExists ? sql`m.author_id AS authorId` : sql`NULL AS authorId`} ,
  //     m.timestamp,
  //     m.reference,
  //     m.channel_id AS channelID
  //   FROM
  //     messages_table m
  //   JOIN
  //     (
  //       SELECT id
  //       FROM RepliesCTE
  //       UNION
  //       SELECT id
  //       FROM AncestorsCTE
  //     ) am
  //   ON
  //     -- Match IDs in the content, accounting for potential URL or other formatting
  //     m.content LIKE '%' || am.id || '%'
  // ),
  // CombinedMessages AS (
  //   SELECT DISTINCT
  //     id,
  //     content,
  //     ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
  //     timestamp,
  //     reference,
  //     channelID
  //   FROM
  //     RepliesCTE
  //   UNION
  //   SELECT DISTINCT
  //     id,
  //     content,
  //     ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
  //     timestamp,
  //     reference,
  //     channelID
  //   FROM
  //     AncestorsCTE
  //   UNION
  //   SELECT DISTINCT
  //     id,
  //     content,
  //     ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
  //     timestamp,
  //     reference,
  //     channelID
  //   FROM
  //     IndirectReferences
  // ),
  // LastMessage AS (
  //   SELECT
  //     id,
  //     content,
  //     ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
  //     timestamp,
  //     reference,
  //     channelID
  //   FROM
  //     CombinedMessages
  //   ORDER BY
  //     timestamp DESC
  //   LIMIT 1
  // )
  // SELECT
  //   id,
  //   content,
  //   ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
  //   timestamp,
  //   reference,
  //   channelID
  // FROM
  //   CombinedMessages
  // ${authorIdColumnExists ? sql`
  // WHERE NOT EXISTS (
  //   SELECT 1
  //   FROM LastMessage lm
  //   WHERE CombinedMessages.id = lm.id
  //     AND lm.authorId IN ('948700837373440061', '678712272209575946')
  // )` : sql``}
  // ORDER BY
  //   timestamp DESC;
  // `;

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
),
IndirectReferences AS (
  SELECT DISTINCT
    m.id,
    m.content,
    ${authorIdColumnExists ? sql`m.author_id AS authorId` : sql`NULL AS authorId`} ,
    m.timestamp,
    m.reference,
    m.channel_id AS channelID
  FROM
    messages_table m
  JOIN
    (
      SELECT id
      FROM RepliesCTE
      UNION
      SELECT id
      FROM AncestorsCTE
    ) am
  ON
    m.content LIKE '%' || am.id || '%'
),
CombinedMessages AS (
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
  UNION
  SELECT DISTINCT
    id,
    content,
    ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
    timestamp,
    reference,
    channelID
  FROM
    IndirectReferences
),
-- Ensuring we capture all messages related through replies or containing IDs
AllRelevantMessages AS (
  SELECT
    id,
    content,
    ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
    timestamp,
    reference,
    channelID
  FROM
    CombinedMessages
  WHERE
    EXISTS (
      SELECT 1
      FROM CombinedMessages c
      WHERE CombinedMessages.content LIKE '%' || c.id || '%'
    )
  OR
    EXISTS (
      SELECT 1
      FROM RepliesCTE r
      WHERE CombinedMessages.id = r.id
      OR CombinedMessages.content LIKE '%' || r.id || '%'
    )
  OR
    EXISTS (
      SELECT 1
      FROM AncestorsCTE a
      WHERE CombinedMessages.id = a.id
      OR CombinedMessages.content LIKE '%' || a.id || '%'
    )
),
LastMessage AS (
  SELECT
    id,
    content,
    ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
    timestamp,
    reference,
    channelID
  FROM
    AllRelevantMessages
  ORDER BY
    timestamp DESC
  LIMIT 1
)
SELECT
  id,
  content,
  ${authorIdColumnExists ? sql`authorId` : sql`NULL AS authorId`} ,
  timestamp,
  reference,
  channelID
FROM
  AllRelevantMessages
${authorIdColumnExists ? sql`
WHERE NOT EXISTS (
  SELECT 1
  FROM LastMessage lm
  WHERE AllRelevantMessages.id = lm.id
    AND lm.authorId IN ('948700837373440061', '678712272209575946')
)` : sql``}
ORDER BY
  timestamp DESC;
`

  // Execute the query with the initial message ID
  const { rows } = await db.execute(query)
  console.timeEnd("Query")
  console.time("Build")
  const full = buildNestedReplies(rows)
  console.timeEnd("Build")
  console.timeEnd("Total");
  console.log("full", JSON.stringify(full, null, 2))



  const e = new EmbedBuilder()
    .setTitle('Message Replies')
    .setColor('#0099ff');


  async function buildDescription(node: any, indentLevel: number): Promise<string> {
    // Create a dashed line for the current indent level
    const indent = '-'.repeat(indentLevel * 2); // Increase or decrease the multiplier for more/less indentation
    const arrow = ' '; // Arrow or space for separator

    // Fetch channel and user information
    const c = await client.channels.fetch(node.channelid) as TextChannel;
    const user = await client.users.fetch(node.authorid);
    const message = await c.messages.fetch(node.id);

    // Build the description for the current node
    let description = `${indent}${arrow} ${i.targetId === node.id ? `**(⭐ This Message)**` : ""} ⌚ <t:${message.createdAt.getTime().toString().slice(0, -3)}:d>  [**👤  ${user.displayName}**](${message.url}): ${node.content.length > 300 ? node.content.slice(0, 300) + "..." : node.content.length === 0 ? "Attachment" : node.content}\n\n`;

    // Recursively add replies
    for (const reply of node.replies) {
      description += await buildDescription(reply, indentLevel + 1);
    }

    return description;
  }

  if (!full.length) {
    e.setDescription("No replies found")
    return i.channel.send({ embeds: [e] });
  }

  // if (full) 
  // Start building the description from the root nodes
  let description = '';
  for (const rootNode of full) {
    description += await buildDescription(rootNode, 0);
  }


  e.setDescription(description);

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




// // Function to build nested replies
// function buildNestedReplies(rows: any[]): any[] {
//   const idToNodeMap = new Map<string, any>();

//   // Create the nodes and map them by ID
//   rows.forEach(row => {
//     // Initialize the node with an empty replies array
//     idToNodeMap.set(row.id, { ...row, replies: [] });
//   });

//   const result: any[] = [];

//   // Build the hierarchy
//   idToNodeMap.forEach(node => {
//     if (node.reference) {
//       // Attach node to its parent's replies
//       const parent = idToNodeMap.get(node.reference);
//       if (parent) {
//         parent.replies.push(node);
//       }
//     } else {
//       // If there's no reference, it's a top-level message
//       result.push(node);
//     }

//   });

//   return result;
// }


// function buildNestedReplies(rows: any[]): any[] {
//   // Step 1: Create a map to keep track of nodes by their ID
//   const idToNodeMap = new Map<string, any>();

//   // Initialize nodes in the map
//   rows.forEach(row => {
//     idToNodeMap.set(row.id, { ...row, replies: [], contentIncludes: new Set<string>() });
//   });

//   // Step 2: Identify references in content
//   rows.forEach(row => {
//     const node = idToNodeMap.get(row.id);
//     if (node) {
//       // Extract IDs from content and add them to the node's contentIncludes
//       const content = node.content;
//       const idPattern = /\b(\d+)\b/g;
//       let match;
//       while ((match = idPattern.exec(content)) !== null) {
//         if (idToNodeMap.has(match[1])) {
//           node.contentIncludes.add(match[1]);
//         }
//       }
//     }
//   });

//   // Step 3: Build the hierarchy
//   const result: any[] = [];
//   rows.forEach(row => {
//     const node = idToNodeMap.get(row.id);
//     if (node) {
//       // Attach replies based on direct references
//       if (node.reference) {
//         const parent = idToNodeMap.get(node.reference);
//         if (parent) {
//           parent.replies.push(node);
//         }
//       }

//       // Attach replies based on content-based references
//       node.contentIncludes.forEach(referenceId => {
//         const parent = idToNodeMap.get(referenceId);
//         if (parent) {
//           parent.replies.push(node);
//         }
//       });

//       // Collect top-level nodes (nodes that are not referenced by others)
//       if (!rows.some(row => idToNodeMap.get(row.reference)?.replies.includes(node))) {
//         result.push(node);
//       }
//     }
//   });

//   // Function to recursively ensure all replies are correctly nested
//   function nestReplies(node: any) {
//     if (node.replies.length > 0) {
//       node.replies.forEach(reply => nestReplies(reply));
//     }
//   }

//   // Nest replies for each top-level node
//   result.forEach(node => nestReplies(node));

//   return result;
// }


function buildNestedReplies(rows: any[]): any[] {
  // Step 1: Create a map to keep track of nodes by their ID
  const idToNodeMap = new Map<string, any>();
  const result: any[] = [];

  // Initialize nodes in the map
  rows.forEach(row => {
    idToNodeMap.set(row.id, { ...row, replies: [] });
  });

  // Step 2: Build the hierarchy based on direct references
  rows.forEach(row => {
    const node = idToNodeMap.get(row.id);
    if (node && node.reference) {
      const parent = idToNodeMap.get(node.reference);
      if (parent) {
        parent.replies.push(node);
      }
    }
  });

  // Step 3: Identify content-based references and build hierarchy
  rows.forEach(row => {
    const node = idToNodeMap.get(row.id);
    if (node) {
      idToNodeMap.forEach((potentialParent, parentId) => {
        if (parentId !== node.id && node.content.includes(parentId)) {
          if (!potentialParent.replies.includes(node)) {
            potentialParent.replies.push(node);
          }
        }
      });
    }
  });

  // Step 4: Collect top-level nodes (nodes that are not referenced by others)
  const referencedIds = new Set<string>();
  idToNodeMap.forEach((node, id) => {
    if (node.replies.length > 0) {
      node.replies.forEach(reply => {
        referencedIds.add(reply.id);
      });
    }
  });

  idToNodeMap.forEach((node, id) => {
    if (!referencedIds.has(id) && !node.reference) {
      result.push(node);
    }
  });

  // Function to recursively ensure all replies are correctly nested
  function nestReplies(node: any) {
    node.replies.forEach(reply => {
      nestReplies(reply);
    });
  }

  // Nest replies for each top-level node
  result.forEach(node => nestReplies(node));

  return result;
}