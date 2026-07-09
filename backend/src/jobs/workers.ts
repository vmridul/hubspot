import { prisma } from "../db/prisma.js";
import { boss, enqueueContactNotesSync } from "./boss.js";
import {
  createHubspotNote,
  fetchContactNotes,
  fetchContactsPage,
  type HubspotAccount
} from "../services/hubspot.service.js";

type ContactSyncJob = {
  accountId: string;
};

type NoteSyncJob = {
  noteId: string;
};

type ContactNotesSyncJob = {
  accountId: string;
  localContactId: string;
  hubspotContactId: string;
};

export async function registerWorkers() {
  await boss.work<ContactSyncJob>("sync-contacts", async ([job]) => {
    await syncContactsForAccount(job.data.accountId);
  });

  await boss.work<ContactNotesSyncJob>("sync-contact-notes", async ([job]) => {
    await syncNotesForContact(
      job.data.accountId,
      job.data.localContactId,
      job.data.hubspotContactId
    );
  });

  await boss.work<NoteSyncJob>("sync-note", async ([job]) => {
    await syncOneNoteToHubSpot(job.data.noteId);
  });
}

async function syncContactsForAccount(accountId: string) {
  const account = await prisma.hubspotAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  let after = account.syncCursor;

  while (true) {
    const page = await fetchContactsPage(account, after);

    for (const hubspotContact of page.results) {
      const localContact = await saveContact(accountId, hubspotContact.id, hubspotContact.properties);
      await enqueueContactNotesSync(accountId, localContact.id, hubspotContact.id);
    }

    after = page.paging?.next?.after ?? null;
    await saveContactSyncCursor(accountId, after);

    if (!after) break;
  }
}

async function saveContact(
  accountId: string,
  hubspotContactId: string,
  properties: Record<string, string | null>
) {
  return prisma.contact.upsert({
    where: {
      hubspotAccountId_hubspotContactId: {
        hubspotAccountId: accountId,
        hubspotContactId
      }
    },
    create: {
      hubspotAccountId: accountId,
      hubspotContactId,
      email: properties.email ?? null,
      firstName: properties.firstname ?? null,
      lastName: properties.lastname ?? null,
      phone: properties.phone ?? null,
      company: properties.company ?? null,
      rawProperties: properties
    },
    update: {
      email: properties.email ?? null,
      firstName: properties.firstname ?? null,
      lastName: properties.lastname ?? null,
      phone: properties.phone ?? null,
      company: properties.company ?? null,
      rawProperties: properties
    }
  });
}

async function syncNotesForContact(
  accountId: string,
  localContactId: string,
  hubspotContactId: string
) {
  const account = await prisma.hubspotAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  const hubspotNotes = await fetchContactNotes(account, hubspotContactId);

  for (const note of hubspotNotes) {
    await prisma.note.upsert({
      where: {
        contactId_hubspotNoteId: {
          contactId: localContactId,
          hubspotNoteId: note.hubspotNoteId
        }
      },
      create: {
        contactId: localContactId,
        body: note.body,
        status: "synced",
        hubspotNoteId: note.hubspotNoteId,
        syncError: null,
        createdAt: note.timestamp ?? undefined
      },
      update: {
        body: note.body,
        status: "synced",
        syncError: null
      }
    });
  }
}

async function syncOneNoteToHubSpot(noteId: string) {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: {
      contact: {
        include: { hubspotAccount: true }
      }
    }
  });

  if (!note || note.status === "synced") return;

  try {
    const hubspotNote = await createHubspotNote(
      note.contact.hubspotAccount,
      note.contact.hubspotContactId,
      note.body
    );

    await prisma.note.update({
      where: { id: noteId },
      data: {
        status: "synced",
        hubspotNoteId: hubspotNote.id,
        syncError: null
      }
    });
  } catch (error) {
    await prisma.note.update({
      where: { id: noteId },
      data: {
        status: "failed",
        syncError: error instanceof Error ? error.message : "Note sync failed"
      }
    });
    throw error;
  }
}

async function saveContactSyncCursor(accountId: string, cursor: string | null) {
  await prisma.hubspotAccount.update({
    where: { id: accountId },
    data: { syncCursor: cursor }
  });
}
