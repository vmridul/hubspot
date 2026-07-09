CREATE TYPE "SyncStatus" AS ENUM ('idle', 'syncing', 'completed', 'failed');
CREATE TYPE "NoteStatus" AS ENUM ('pending', 'synced', 'failed');

CREATE TABLE "hubspot_accounts" (
  "id" TEXT NOT NULL,
  "hubId" TEXT,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "connected" BOOLEAN NOT NULL DEFAULT true,
  "syncStatus" "SyncStatus" NOT NULL DEFAULT 'idle',
  "syncCursor" TEXT,
  "syncError" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hubspot_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contacts" (
  "id" TEXT NOT NULL,
  "hubspotAccountId" TEXT NOT NULL,
  "hubspotContactId" TEXT NOT NULL,
  "email" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "phone" TEXT,
  "company" TEXT,
  "rawProperties" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notes" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "NoteStatus" NOT NULL DEFAULT 'pending',
  "hubspotNoteId" TEXT,
  "syncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contacts_hubspotAccountId_hubspotContactId_key" ON "contacts"("hubspotAccountId", "hubspotContactId");
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
CREATE INDEX "notes_contactId_idx" ON "notes"("contactId");

ALTER TABLE "contacts" ADD CONSTRAINT "contacts_hubspotAccountId_fkey"
  FOREIGN KEY ("hubspotAccountId") REFERENCES "hubspot_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notes" ADD CONSTRAINT "notes_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
