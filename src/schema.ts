import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';


export const messagesTable = pgTable('messages_table', {
    id: text('id').primaryKey(),
    content: text('content'),
    authorId: text('author_id').notNull(),
    cursor: boolean("cursor").notNull(),
    channelId: text('channel_id').notNull(),
    timestamp: timestamp('timestamp').notNull(),
    reference: text('reference').references(() => messagesTable.id),
    // reference: text('reference'),
})


export type MessagesTable = typeof messagesTable.$inferSelect;