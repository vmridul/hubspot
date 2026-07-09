import PgBoss from "pg-boss";

export const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL
});

export async function startBoss() {
  await boss.start();
  await Promise.all([
    boss.createQueue("sync-contacts"),
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
