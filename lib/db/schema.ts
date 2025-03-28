import {
  sqliteTable,
  text,
  integer,
  blob,
  foreignKey,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type { InferSelectModel } from 'drizzle-orm';

export const chat = sqliteTable('Chat', {
  id: text('id').primaryKey().notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  title: text('title').notNull(),
  visibility: text('visibility')
    .notNull()
    .default('private')
    .$type<'public' | 'private'>(),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = sqliteTable('Message', {
  id: text('id').primaryKey().notNull(),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: text('role').notNull(),
  content: blob('content', { mode: 'json' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = sqliteTable(
  'Vote',
  {
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: text('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: integer('isUpvoted', { mode: 'boolean' }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = sqliteTable(
  'Document',
  {
    id: text('id').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: text('kind')
      .notNull()
      .default('text')
      .$type<'text' | 'code' | 'image' | 'sheet'>(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = sqliteTable(
  'Suggestion',
  {
    id: text('id').notNull(),
    documentId: text('documentId').notNull(),
    documentCreatedAt: integer('documentCreatedAt', {
      mode: 'timestamp',
    }).notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: integer('isResolved', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey(() => ({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    })),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const invoiceFile = sqliteTable(
  'InvoiceFile',
  {
    id: text('id').primaryKey().notNull().$defaultFn(() => {
      return crypto.randomUUID();
    }),
    userId: text('userId').notNull(),
    title: text('title').notNull(),
    kind: text('kind')
      .notNull()
      .$type<'image' | 'pdf'>(),
    content: text('content').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    uniqueContent: uniqueIndex('unique_content_user').on(table.content, table.userId),
  }),
);

export type InvoiceFile = InferSelectModel<typeof invoiceFile>;

export const invoice = sqliteTable(
  'Invoice',
  {
    id: text('id').primaryKey().notNull().$defaultFn(() => {
      return crypto.randomUUID();
    }),
    userId: text('userId').notNull(),
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),

    status: text('status')
      .notNull()
      .default('processing')
      .$type<'processing' | 'completed' | 'error'>(),
    
    // Invoice information
    customerName: text('customerName'),
    vendorName: text('vendorName'),
    invoiceNumber: text('invoiceNumber'),
    invoiceDate: integer('invoiceDate', { mode: 'timestamp' }),
    dueDate: integer('dueDate', { mode: 'timestamp' }),
    amount: integer('amount'), // Store as cents to avoid floating point issues
    currency: text('currency'),
    
    // Line items as JSON array
    lineItems: text('lineItems'), // Will store JSON string of array of {description, quantity, unitPrice, total}
    
    // Metadata
    rawExtractedText: text('rawExtractedText'),
    confidenceScore: integer('confidenceScore'),
    
    // Tracking
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
  }),
);

export type Invoice = InferSelectModel<typeof invoice>;