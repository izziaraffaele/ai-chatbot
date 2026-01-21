-- SIBAC File Index tables
-- This migration creates the index table for SIBAC shared folder files

-- Create the main file index table
CREATE TABLE IF NOT EXISTS "SibacFileIndex" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'sibac-shared' NOT NULL,
	"path" text NOT NULL UNIQUE,
	"parentPath" text NOT NULL,
	"name" text NOT NULL,
	"ext" text NOT NULL,
	"size" integer,
	"mtime" timestamp,
	"hash" text,
	"supplier" text,
	"supplierVatId" text,
	"buyer" text,
	"buyerVatId" text,
	"invoiceDate" date,
	"invoiceNumber" text,
	"documentType" text,
	"totalAmount" numeric,
	"currency" text,
	"fatturaValida" boolean,
	"campiMancanti" jsonb,
	"campiNonValidi" jsonb,
	"searchText" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Create the index metadata table for version tracking
CREATE TABLE IF NOT EXISTS "SibacIndexMeta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Initialize index version
INSERT INTO "SibacIndexMeta" ("key", "value", "updatedAt")
VALUES ('indexVersion', '1', now())
ON CONFLICT ("key") DO NOTHING;

-- Create standard indexes
CREATE INDEX IF NOT EXISTS "idx_sibac_file_index_parent" ON "SibacFileIndex" ("parentPath");
CREATE INDEX IF NOT EXISTS "idx_sibac_file_index_ext" ON "SibacFileIndex" ("ext");
CREATE INDEX IF NOT EXISTS "idx_sibac_file_index_mtime" ON "SibacFileIndex" ("mtime" DESC);
CREATE INDEX IF NOT EXISTS "idx_sibac_file_index_supplier_vat" ON "SibacFileIndex" ("supplierVatId");
CREATE INDEX IF NOT EXISTS "idx_sibac_file_index_valid" ON "SibacFileIndex" ("fatturaValida");

-- Enable pg_trgm extension for fast ILIKE search
-- Note: This requires superuser or CREATE privilege on the database
-- If this fails, ask your DBA to run: CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram GIN index for fast text search
CREATE INDEX IF NOT EXISTS "idx_sibac_file_index_search_trgm" 
	ON "SibacFileIndex" USING GIN ("searchText" gin_trgm_ops);
