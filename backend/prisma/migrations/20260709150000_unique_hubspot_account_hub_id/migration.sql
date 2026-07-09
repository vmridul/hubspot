DELETE FROM "hubspot_accounts" duplicate
USING "hubspot_accounts" kept
WHERE duplicate."hubId" IS NOT NULL
  AND duplicate."hubId" = kept."hubId"
  AND duplicate."createdAt" > kept."createdAt";

CREATE UNIQUE INDEX "hubspot_accounts_hubId_key" ON "hubspot_accounts"("hubId");
