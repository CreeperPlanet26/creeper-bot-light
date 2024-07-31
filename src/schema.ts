import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';


export const messagesTable = pgTable('messages_table', {
    id: text('id').primaryKey(),
    content: text('content').notNull(),
    channelId: text('channel_id').notNull(),
    timestamp: timestamp('timestamp').notNull(),
    reference: text('reference').references(() => messagesTable.id),
})


export type MessagesTable = typeof messagesTable.$inferSelect;