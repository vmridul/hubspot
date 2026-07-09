## Stack

- Next.js frontend
- Express backend
- PostgreSQL database
- Prisma ORM
- pg-boss for background jobs
- HubSpot OAuth APIs

## Run Locally

Start the backend:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```txt
http://localhost:3000
```

Backend runs at:

```txt
http://localhost:4000
```

## Environment

Backend needs:

```txt
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
FRONTEND_URL="http://localhost:3000"
HUBSPOT_CLIENT_ID="..."
HUBSPOT_CLIENT_SECRET="..."
HUBSPOT_REDIRECT_URI="http://localhost:4000/api/hubspot/oauth/callback"
TOKEN_ENCRYPTION_KEY="use-a-long-random-secret"
PORT="4000"
```

Frontend needs:

```txt
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## HubSpot Setup

Create a HubSpot app and add this redirect URL:

```txt
http://localhost:4000/api/hubspot/oauth/callback
```

Required scopes:

```txt
crm.objects.contacts.read
crm.objects.contacts.write
```
