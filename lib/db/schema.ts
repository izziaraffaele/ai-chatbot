import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.messageId, table.chatId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      name: "Suggestion_documentRef",
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// ============================================================================
// SIBAC FILE INDEX TABLES
// ============================================================================

/**
 * SIBAC File Index - stores metadata for files in the SIBAC shared folder
 * Used for fast search without filesystem traversal
 *
 * NOTE: Never stores file content (privacy requirement)
 */
export const sibacFileIndex = pgTable("SibacFileIndex", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  /** Data source identifier (e.g., "sibac-shared") */
  source: text("source").notNull().default("sibac-shared"),
  /** Relative path from sibac-shared root (UNIQUE) */
  path: text("path").notNull().unique(),
  /** Parent directory path for folder queries */
  parentPath: text("parentPath").notNull(),
  /** File name without path */
  name: text("name").notNull(),
  /** File extension (e.g., "xml", "pdf") */
  ext: text("ext").notNull(),
  /** File size in bytes */
  size: integer("size"),
  /** File modification time */
  mtime: timestamp("mtime"),
  /** Optional checksum for change detection */
  hash: text("hash"),

  // Search helper - normalized concatenation of name + path for fast text search
  /** Normalized search text for pg_trgm ILIKE queries */
  searchText: text("searchText").notNull(),

  // Timestamps
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type SibacFileIndex = InferSelectModel<typeof sibacFileIndex>;

/**
 * SIBAC Index Metadata - stores key-value pairs for index management
 * Used for tracking index version (cache invalidation)
 */
export const sibacIndexMeta = pgTable("SibacIndexMeta", {
  /** Key identifier (e.g., "indexVersion") */
  key: text("key").primaryKey().notNull(),
  /** Value as text (caller parses as needed) */
  value: text("value").notNull(),
  /** Last update timestamp */
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type SibacIndexMeta = InferSelectModel<typeof sibacIndexMeta>;
