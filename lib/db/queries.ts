import 'server-only';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

import {
  chat,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
  invoiceFile,
  invoice,
} from './schema';
import type { BlockKind } from '@/components/block';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      // userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      // .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: BlockKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      // userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}


// Invoice File Queries
export async function createInvoiceFile(data: {
  userId: string;
  title: string;
  kind: 'image' | 'pdf';
  content: string;
}) {
  const [file] = await db
    .insert(invoiceFile)
    .values({
      ...data,
      createdAt: new Date(),
    })
    .returning();
  return file;
}

export async function checkDuplicateInvoiceFile({
  userId,
  content,
}: {
  userId: string;
  content: string;
}) {
  const [existingFile] = await db
    .select()
    .from(invoiceFile)
    .where(
      and(
        eq(invoiceFile.userId, userId),
        eq(invoiceFile.content, content)
      )
    );
  return existingFile !== undefined;
}


export async function getInvoiceFileById(id: string) {
  const [file] = await db
    .select()
    .from(invoiceFile)
    .where(eq(invoiceFile.id, id));
  return file;
}

// Create a new invoice
export async function createInvoice(data: {
  userId: string;
  chatId: string;
  customerName?: string;
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  amount?: number;
  currency?: string;
  lineItems?: string; // JSON string of line items
  rawExtractedText?: string;
  confidenceScore?: number;
  status?: 'processing' | 'completed' | 'error';
}) {
  const now = new Date();
  const [newInvoice] = await db
    .insert(invoice)
    .values({
      ...data,
      status: data.status || 'processing',
      createdAt: now,
      updatedAt: now
    })
    .returning();
  return newInvoice;
}

// Get invoice by ID
export async function getInvoiceById({ id }: { id: string }) {
  const [result] = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, id));
  return result;
}

// Get all invoices for a user
export async function getInvoicesByUserId({ userId }: { userId: string }) {
  const invoices = await db
    .select()
    .from(invoice)
    .where(eq(invoice.userId, userId))
    .orderBy(desc(invoice.createdAt));
  return invoices;
}

// Update an invoice
export async function updateInvoice(data: {
  id: string;
  userId: string;
  customerName?: string;
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  amount?: number;
  currency?: string;
  lineItems?: string;
  rawExtractedText?: string;
  confidenceScore?: number;
  status?: 'processing' | 'completed' | 'error';
}) {
  const { id, userId, ...updateData } = data;
  const [updatedInvoice] = await db
    .update(invoice)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(invoice.id, id),
        eq(invoice.userId, userId)
      )
    )
    .returning();
  return updatedInvoice;
}

// Delete an invoice
export async function deleteInvoice({ id, userId }: { id: string; userId: string }) {
  const [deletedInvoice] = await db
    .delete(invoice)
    .where(
      and(
        eq(invoice.id, id),
        eq(invoice.userId, userId)
      )
    )
    .returning();
  return deletedInvoice;
}

// Check for duplicate invoice number for a user
export async function checkDuplicateInvoiceNumber({
  userId,
  invoiceNumber,
}: {
  userId: string;
  invoiceNumber: string;
}) {
  const [existingInvoice] = await db
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.userId, userId),
        eq(invoice.invoiceNumber, invoiceNumber)
      )
    );
  return existingInvoice !== undefined;
}