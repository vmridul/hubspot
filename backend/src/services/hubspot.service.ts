import { prisma } from "../db/prisma.js";
import { decrypt, encrypt } from "../utils/encryption.js";

const scopes = ["crm.objects.contacts.read", "crm.objects.contacts.write"];

type HubspotToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  hub_id?: number;
};

export type HubspotAccount = {
  id: string;
  hubId: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresAt: Date;
};

type HubspotContactsResponse = {
  results: Array<{
    id: string;
    properties: Record<string, string | null>;
  }>;
  paging?: {
    next?: {
      after: string;
    };
  };
};

type HubspotEngagementsResponse = {
  results: Array<{
    engagement: {
      id: number;
      type: string;
      timestamp?: number;
      bodyPreview?: string;
    };
    metadata?: {
      body?: string;
    };
  }>;
  hasMore?: boolean;
  offset?: number;
};

type HubspotNoteFromApi = {
  hubspotNoteId: string;
  body: string;
  timestamp: Date | null;
};

export function buildHubspotAuthorizationUrl(state: string) {
  const url = new URL("https://app.hubspot.com/oauth/authorize");
  url.searchParams.set("client_id", process.env.HUBSPOT_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", process.env.HUBSPOT_REDIRECT_URI || "");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

async function requestHubspotToken(body: URLSearchParams) {
  const response = await fetch("https://api.hubapi.com/oauth/2026-03/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot token request failed: ${text}`);
  }

  return response.json() as Promise<HubspotToken>;
}

export async function exchangeCodeForAccount(code: string) {
  const token = await requestHubspotToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.HUBSPOT_CLIENT_ID || "",
      client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
      redirect_uri: process.env.HUBSPOT_REDIRECT_URI || "",
      code,
    }),
  );

  return prisma.hubspotAccount.create({
    data: {
      hubId: token.hub_id ? String(token.hub_id) : null,
      accessTokenEncrypted: encrypt(token.access_token),
      refreshTokenEncrypted: encrypt(token.refresh_token),
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      connected: true,
    },
  });
}

export async function getHubspotAccount(accountId: string) {
  return prisma.hubspotAccount.findFirst({
    where: {
      id: accountId,
      connected: true,
    },
  });
}

export async function getValidAccessToken(account: HubspotAccount) {
  const tokenStillWorks = account.expiresAt.getTime() > Date.now() + 60_000;

  if (tokenStillWorks) {
    return decrypt(account.accessTokenEncrypted);
  }

  const token = await requestHubspotToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.HUBSPOT_CLIENT_ID || "",
      client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
      refresh_token: decrypt(account.refreshTokenEncrypted),
    }),
  );

  await prisma.hubspotAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEncrypted: encrypt(token.access_token),
      refreshTokenEncrypted: encrypt(token.refresh_token),
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      hubId: token.hub_id ? String(token.hub_id) : account.hubId,
    },
  });

  return token.access_token;
}

async function callHubspot(
  account: HubspotAccount,
  path: string,
  body?: unknown,
) {
  const accessToken = await getValidAccessToken(account);
  const response = await fetch(`https://api.hubapi.com${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot API request failed: ${text}`);
  }

  return response;
}

export async function fetchContactsPage(
  account: HubspotAccount,
  after?: string | null,
) {
  const params = new URLSearchParams({
    limit: "100",
    properties: "email,firstname,lastname,phone,company,hs_lead_status",
  });

  if (after) {
    params.set("after", after);
  }

  const path = `/crm/v3/objects/contacts?${params.toString()}`;
  const response = await callHubspot(account, path);
  return response.json() as Promise<HubspotContactsResponse>;
}

function stripHtml(value?: string | null) {
  if (!value) {
    return "";
  }

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchContactNotes(
  account: HubspotAccount,
  contactHubspotId: string,
) {
  const notes: HubspotNoteFromApi[] = [];

  const path = `/engagements/v1/engagements/associated/contact/${contactHubspotId}/paged`;
  const response = await callHubspot(account, path);
  const page = (await response.json()) as HubspotEngagementsResponse;

  for (const item of page.results ?? []) {
    if (item.engagement.type !== "NOTE") {
      continue;
    }

    notes.push({
      hubspotNoteId: String(item.engagement.id),
      body: stripHtml(item.metadata?.body) || item.engagement.bodyPreview || "",
      timestamp: item.engagement.timestamp
        ? new Date(item.engagement.timestamp)
        : null,
    });
  }

  return notes;
}

export async function createHubspotNote(
  account: HubspotAccount,
  contactHubspotId: string,
  body: string,
) {
  const note = {
    properties: {
      hs_timestamp: new Date().toISOString(),
      hs_note_body: body,
    },
    associations: [
      {
        to: { id: contactHubspotId },
        types: [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 202,
          },
        ],
      },
    ],
  };

  const response = await callHubspot(account, "/crm/v3/objects/notes", note);

  return response.json() as Promise<{ id: string }>;
}
