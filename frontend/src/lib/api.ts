const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type HubspotStatus = {
  connected: boolean;
};

export type Contact = {
  id: string;
  hubspotAccountId: string;
  hubspotContactId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  rawProperties: unknown;
  createdAt: string;
  updatedAt: string;
};

export type ContactPage = {
  items: Contact[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Note = {
  id: string;
  contactId: string;
  body: string;
  status: "pending" | "synced" | "failed";
  hubspotNoteId: string | null;
  syncError: string | null;
  createdAt: string;
  updatedAt: string;
};

async function callBackend<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${backendUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(options?.headers ?? {})
    },
    cache: "no-store"
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message ?? "Request failed");
  }

  return result as T;
}

export const api = {
  connectUrl: `${backendUrl}/api/hubspot/connect`,

  hubspotStatus: () => callBackend<HubspotStatus>("/api/hubspot"),

  contacts: (page = 1, limit = 25, search = "") => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });

    if (search.trim()) {
      params.set("q", search.trim());
    }

    return callBackend<ContactPage>(`/api/contacts?${params.toString()}`);
  },

  contact: (id: string) => callBackend<Contact>(`/api/contacts/${id}`),

  notes: (contactId: string) => callBackend<Note[]>(`/api/notes?contactId=${contactId}`),

  createNote: (contactId: string, body: string) =>
    callBackend<Note>("/api/notes", {
      method: "POST",
      body: JSON.stringify({ contactId, body })
    })
};
