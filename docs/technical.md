# Technical Documentation

## Architecture

The app is intentionally small:

```txt
Next.js frontend -> Express API -> PostgreSQL
                         |
                         v
                    pg-boss workers
                         |
                         v
                    HubSpot APIs
```

The Express app serves API requests and starts pg-boss workers in the same process. This keeps local development and deployment simple while still using durable background jobs for sync work.

## OAuth Implementation

The user starts at:

```txt
GET /api/hubspot/connect
```

The backend creates a signed `state` value and redirects to HubSpot's authorization URL. After approval, HubSpot redirects to:

```txt
GET /api/hubspot/oauth/callback?code=...&state=...
```

The backend validates `state`, exchanges the temporary `code` for an access token and refresh token, encrypts both tokens, stores them in `hubspot_accounts`, queues `sync-contacts`, and redirects the user back to the frontend.

HubSpot's current OAuth docs describe the authorization code as a temporary, single-use value returned on the redirect URL, then exchanged through `/oauth/2026-03/token`.

## Database Schema

`hubspot_accounts` stores the connected portal, encrypted OAuth tokens, token expiry, and the contact sync cursor.

`contacts` stores synced HubSpot contacts. The unique key on `(hubspotAccountId, hubspotContactId)` makes contact sync idempotent.

`notes` stores notes created in the app. Notes remain local even if HubSpot sync fails, so the UI can show `pending`, `synced`, or `failed`.

## Synchronization Flow

Contact sync starts automatically after OAuth succeeds.

```txt
OAuth callback
-> create hubspot_accounts row
-> enqueue sync-contacts
-> worker fetches contacts page by page
-> worker upserts contacts
-> worker saves syncCursor after each page
-> worker marks sync completed or failed
```

The worker requests contacts from HubSpot using the CRM contacts endpoint and asks for the properties needed by the UI: email, firstname, lastname, phone, and company.

## Notes Flow

The frontend creates notes through:

```txt
POST /api/notes
```

The backend imports HubSpot notes during contact sync through HubSpot's legacy engagements endpoint for contact-associated activities, filtering activity type `NOTE`. The project deploy flow rejects `crm.objects.notes.*` scopes for this app, but contact read/write scopes work for the contact-associated engagements path in this portal.

The backend saves new notes as `pending` and enqueues `sync-note`. The worker creates a HubSpot note through `/crm/v3/objects/notes` and includes an association to the target contact using HubSpot's default note-to-contact association type ID `202`, which is shown in HubSpot's notes API guide.

If HubSpot succeeds, the local note is marked `synced`. If it fails after retries, the note remains visible and is marked `failed`.

## Background Processing Strategy

pg-boss is used because it works directly with PostgreSQL. That avoids adding Redis or a second infrastructure dependency.

Jobs:

```txt
sync-contacts
sync-note
```

Both jobs use a retry limit of `3` with backoff enabled.

## Error Handling

API routes return plain JSON. Error responses use `{ "message": "Error message" }`.

Note sync errors are stored on `notes.syncError`.

## Scalability Approach

This implementation shows a simple production-shaped path without overbuilding:

- Sync work runs in background jobs, not web requests.
- pg-boss persists jobs in PostgreSQL.
- Contact writes are idempotent because of the HubSpot contact ID unique key.
- `syncCursor` allows interrupted contact sync to continue from the last saved page.
- More worker processes can be started against the same database later.

The app does not implement webhooks, advanced rate-limit coordination, metrics, or a retry dashboard. Those are good future improvements, but they are intentionally out of scope for this simple assignment version.

## Tradeoffs

- API and workers run in one backend process for simpler deployment.
- PostgreSQL is used for both app data and the queue.
- The app supports one connected HubSpot portal instead of a full multi-user auth model.
- The frontend is clean and functional rather than pixel-heavy.
