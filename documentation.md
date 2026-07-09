# Documentation

## System Architecture

The app has three main parts:

```txt
Next.js frontend -> Express API -> PostgreSQL
                         |
                         v
                    pg-boss worker
                         |
                         v
                    HubSpot API
```

The frontend talks only to the backend. The backend stores data in Postgres and uses background jobs for longer HubSpot work.

## OAuth Implementation

The user clicks "Connect HubSpot" and the backend redirects them to HubSpot OAuth.

After HubSpot approves the app, it redirects back with a temporary `code`. The backend verifies the `state`, exchanges the code for tokens, encrypts the tokens, stores them, queues a contact sync job, and sends the user back to the frontend.

Access tokens are refreshed automatically when they are close to expiry.

## Database Schema

There are three main tables:

- `hubspot_accounts`: connected portal, encrypted tokens, expiry time, and sync cursor
- `contacts`: synced HubSpot contacts with basic fields and raw HubSpot properties
- `notes`: notes created or imported for a contact, including sync status

Contacts are unique by HubSpot account and HubSpot contact ID, so repeated syncs update the same row instead of creating duplicates.

## Synchronization Flow

Contact sync starts after OAuth succeeds.

```txt
OAuth callback
-> save HubSpot account
-> queue sync-contacts job
-> fetch HubSpot contacts page by page
-> upsert contacts into Postgres
-> import HubSpot notes for each contact
-> save sync cursor
```

The frontend reads contacts from Postgres. It does not call HubSpot directly.

## Background Processing Strategy

pg-boss runs background jobs using Postgres as the queue.

Current jobs:

- `sync-contacts`: pulls contacts and existing notes from HubSpot
- `sync-note`: sends a newly created local note back to HubSpot

This keeps slow external API work out of normal web requests.

## Error Handling

API errors return JSON like:

```json
{ "message": "Something went wrong" }
```

The frontend shows these messages in simple alert states.

If a note fails to sync, the note stays visible locally and stores the sync error so the user does not lose their work.

## Retry Strategy

Background jobs are retried by pg-boss with backoff.

That means temporary HubSpot or network failures can recover without the user doing anything. If retries still fail, the local record remains in Postgres with a failed status or error message.

## Scalability Approach

The app is small, but the shape can grow:

- Contacts are fetched in HubSpot pages.
- Local contact APIs support page and search parameters.
- Contact writes are idempotent.
- Background jobs can run in separate worker processes later.
- Webhooks or scheduled sync jobs can be added for fresher data.

## Design Decisions and Tradeoffs

- The backend and worker run in one process to keep deployment simple.
- Postgres is used for both app data and the job queue to avoid extra infrastructure.
- The frontend polls the backend every few seconds, but the backend does not currently poll HubSpot on a schedule.
- The app stores selected contact fields for the table and keeps raw HubSpot properties for detail views.
- The demo assumes one connected HubSpot account instead of building a full user system.
