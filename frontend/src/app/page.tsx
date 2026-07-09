"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, LoaderCircle, Search, Table2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  api,
  type Contact,
  type ContactPage,
  type HubspotStatus,
} from "@/lib/api";

function getContactName(contact: Contact) {
  return (
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed"
  );
}

function getInitials(name: string) {
  const words = name.split(" ").filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const emptyContacts: ContactPage = {
  items: [],
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0,
};

export default function Home() {
  const [hubspot, setHubspot] = useState<HubspotStatus | null>(null);
  const [contacts, setContacts] = useState<ContactPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [freshlyConnected, setFreshlyConnected] = useState(false);

  async function load(searchValue = debouncedSearch) {
    try {
      setError(null);
      const hubspotData = await api.hubspotStatus();
      setHubspot(hubspotData);

      if (!hubspotData.connected) {
        setContacts(emptyContacts);
        return;
      }

      const contactData = await api.contacts(1, 25, searchValue);
      setContacts(contactData);
      if (contactData.total > 0) {
        setFreshlyConnected(false);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") !== "true") {
      return;
    }

    setFreshlyConnected(true);
    params.delete("connected");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    load(debouncedSearch);
  }, [debouncedSearch]);

  const hasContacts = Boolean(contacts?.items.length);
  const showSyncingContacts = freshlyConnected && !loading && !hasContacts;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-3 px-3 py-3 md:px-4">
      <section className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-44 items-center gap-2">
          <img
            src="/logo.png"
            alt="HubSpot"
            className="size-8 object-contain"
          />
          <span className="text-lg font-semibold">HubSpot</span>
        </div>

        <div className="flex w-44 justify-end">
          {loading ? (
            <Skeleton className="h-10 w-44" />
          ) : hubspot?.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => load()}
              className="h-10 w-44"
            >
              Connected
            </Button>
          ) : (
            <Button asChild size="sm" className="h-10 w-44 text-white">
              <a href={api.connectUrl}>Connect HubSpot</a>
            </Button>
          )}
        </div>
      </section>

      <nav className="border-b">
        <button className="flex h-10 items-center gap-2 border-b-2 border-gray-500! px-2 text-left text-sm font-semibold">
          <Table2 className="size-4" />
          All contacts
        </button>
      </nav>

      <section className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contacts"
            className="pl-9"
            disabled={!hubspot?.connected && !loading}
          />
        </div>
        {contacts ? (
          <p className="shrink-0 text-sm text-muted-foreground">
            {contacts.total} contacts
          </p>
        ) : null}
      </section>

      {error ? (
        <Alert>
          <AlertTitle>Unable to load data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="overflow-hidden rounded-lg border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <Table className="min-w-[1000px] border-separate border-spacing-0">
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="h-9 border-b bg-[#f2f2f2] hover:bg-[#f2f2f2]">
                <TableHead className="w-[280px] border-r px-4 text-sm font-semibold text-foreground">
                  Name
                </TableHead>
                <TableHead className="w-[280px] border-r px-4 text-sm font-semibold text-foreground">
                  Email
                </TableHead>
                <TableHead className="w-[240px] border-r px-4 text-sm font-semibold text-foreground">
                  HubSpot ID
                </TableHead>
                <TableHead className="w-[260px] border-r px-4 text-sm font-semibold text-foreground">
                  Company Name
                </TableHead>
                <TableHead className="w-[140px] border-r px-4 text-sm font-semibold text-foreground">
                  Phone Number
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasContacts ? (
                contacts?.items.map((contact) => {
                  const name = getContactName(contact);
                  return (
                    <TableRow
                      key={contact.id}
                      className="h-10 border-b hover:bg-muted/35"
                    >
                      <TableCell className="border-r px-4 py-0">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                            {getInitials(name)}
                          </span>
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="min-w-0 truncate text-sm font-semibold text-[#006b6b] underline decoration-[#006b6b] underline-offset-4"
                          >
                            {name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="border-r px-4 py-0">
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="inline-flex max-w-full items-center gap-1.5 truncate text-sm font-semibold text-[#006b6b] underline decoration-[#006b6b] underline-offset-4"
                          >
                            <span className="truncate">{contact.email}</span>
                            <ExternalLink className="size-4 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="border-r px-4 py-0 text-sm">
                        {contact.hubspotContactId}
                      </TableCell>
                      <TableCell className="border-r px-4 py-0 text-sm">
                        {contact.company ?? "--"}
                      </TableCell>
                      <TableCell className="border-r px-4 py-0 text-sm">
                        {contact.phone ?? "--"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="h-12 border-b hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="px-4 py-0 text-center text-sm text-muted-foreground"
                  >
                    {showSyncingContacts ? (
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="size-4 animate-spin" />
                        Syncing contacts
                      </span>
                    ) : (
                      "No contacts found"
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}
