"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, type Contact, type Note } from "@/lib/api";

type PageProps = {
  params: Promise<{ id: string }>;
};

function readablePropertyName(key: string) {
  return key
    .replace(/^hs_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getHubspotProperties(contact: Contact | null) {
  if (!contact?.rawProperties || typeof contact.rawProperties !== "object") {
    return [];
  }

  return Object.entries(contact.rawProperties as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .sort(([first], [second]) => first.localeCompare(second));
}

export default function ContactDetail({ params }: PageProps) {
  const [contactId, setContactId] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((resolved) => setContactId(resolved.id));
  }, [params]);

  async function load(id = contactId) {
    if (!id) return;
    try {
      setError(null);
      const [contactData, noteData] = await Promise.all([api.contact(id), api.notes(id)]);
      setContact(contactData);
      setNotes(noteData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load contact");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!contactId) return;
    load(contactId);
    const timer = window.setInterval(() => load(contactId), 6000);
    return () => window.clearInterval(timer);
  }, [contactId]);

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!contactId || !trimmed) return;

    try {
      setSubmitting(true);
      setError(null);
      const note = await api.createNote(contactId, trimmed);
      setNotes((current) => [note, ...current]);
      setBody("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add note");
    } finally {
      setSubmitting(false);
    }
  }

  const name = useMemo(() => {
    if (!contact) return "Contact";
    return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed contact";
  }, [contact]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-3 px-3 py-3 md:px-4">
      <div className="border-b pb-2">
        <Button asChild variant="ghost" size="sm" className="mb-1 h-8 w-fit px-0">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Contacts
          </Link>
        </Button>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
        ) : (
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-xl font-semibold">{name}</h1>
              <p className="text-xs text-muted-foreground">{contact?.email ?? "No email address"}</p>
            </div>
            <div className="text-xs text-muted-foreground md:text-right">
              <p>{contact?.company ?? "No company"}</p>
              <p>{contact?.phone ?? "No phone"}</p>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <Alert>
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-md border bg-card p-3">
        <div>
          <h2 className="text-sm font-semibold">HubSpot properties</h2>
        </div>

        <Separator className="my-2" />

        {loading ? (
          <div className="grid gap-2 md:grid-cols-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : getHubspotProperties(contact).length ? (
          <dl className="grid gap-2 md:grid-cols-3">
            {getHubspotProperties(contact).map(([key, value]) => (
              <div key={key} className="rounded-md border bg-background px-2.5 py-2">
                <dt className="text-xs font-medium text-muted-foreground">{readablePropertyName(key)}</dt>
                <dd className="mt-1 break-words text-sm">{String(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No extra HubSpot properties were synced for this contact.</p>
        )}
      </section>

      <section className="rounded-md border bg-card p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="text-xs text-muted-foreground">{notes.length} total</p>
          </div>
        </div>

        <form className="mt-2 space-y-2" onSubmit={submitNote}>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add a note for this contact"
            disabled={submitting || loading}
          />
          <Button disabled={submitting || !body.trim()}>
            <Send className="size-4" />
            {submitting ? "Saving" : "Add note"}
          </Button>
        </form>

        <Separator className="my-3" />

        <div className="space-y-2">
          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : notes.length ? (
            notes.map((note) => (
              <article key={note.id} className="rounded-md border bg-background px-2.5 py-2">
                <p className="whitespace-pre-wrap text-sm leading-5">{note.body}</p>
                {note.syncError ? <p className="mt-3 text-sm text-destructive">{note.syncError}</p> : null}
              </article>
            ))
          ) : (
            <div className="py-6 text-center">
              <p className="font-medium">No notes yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add the first note and it will sync back to HubSpot.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
