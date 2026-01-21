-- Remove invoice metadata columns from SibacFileIndex
-- These columns are no longer needed (privacy: only store file metadata, not invoice data)

ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "supplier";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "supplierVatId";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "buyer";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "buyerVatId";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "invoiceDate";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "invoiceNumber";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "documentType";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "totalAmount";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "fatturaValida";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "campiMancanti";
ALTER TABLE "SibacFileIndex" DROP COLUMN IF EXISTS "campiNonValidi";

-- Drop indexes that referenced removed columns
DROP INDEX IF EXISTS "idx_sibac_file_index_supplier_vat";
DROP INDEX IF EXISTS "idx_sibac_file_index_valid";
