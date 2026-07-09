ALTER TABLE "hubspot_accounts" DROP COLUMN IF EXISTS "syncStatus";
ALTER TABLE "hubspot_accounts" DROP COLUMN IF EXISTS "syncError";
ALTER TABLE "hubspot_accounts" DROP COLUMN IF EXISTS "lastSyncAt";
DROP TYPE IF EXISTS "SyncStatus";
