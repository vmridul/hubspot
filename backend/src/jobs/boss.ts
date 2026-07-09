import PgBoss from "pg-boss";

export const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL
});

export async function startBoss() {
  await boss.start();
  await Promise.all([
    boss.createQueue("sync-contacts"),
    boss.createQueue("sync-contact-notes"),
    boss.createQueue("sync-note")
  ]);
}

export async function enqueueContactSync(accountId: string) {
  return boss.send(
    "sync-contacts",
    { accountId },
    {
      retryLimit: 3,
      retryBackoff: true
    }
  );
}

export async function enqueueNoteSync(noteId: string) {
  return boss.send(
    "sync-note",
    { noteId },
    {
      retryLimit: 3,
      retryBackoff: true
    }
  );
}

export async function enqueueContactNotesSync(
  accountId: string,
  localContactId: string,
  hubspotContactId: string
) {
  return boss.send(
    "sync-contact-notes",
    { accountId, localContactId, hubspotContactId },
    {
      retryLimit: 3,
      retryBackoff: true
    }
  );
}
