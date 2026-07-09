## Deployments
- Frontend: https://hubspot-rho.vercel.app
- Backend: https://hubspot-aw6a.onrender.com

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
FRONTEND_URL="..."
HUBSPOT_CLIENT_ID="..."
HUBSPOT_CLIENT_SECRET="..."
HUBSPOT_REDIRECT_URI="{backend url}/api/hubspot/oauth/callback"
TOKEN_ENCRYPTION_KEY="use-a-long-random-secret"
PORT="4000"
```

Frontend needs:

```txt
NEXT_PUBLIC_API_URL="backend url"
```

## HubSpot Setup

Create a HubSpot app and add this redirect URL:

```txt
{backend url}/api/hubspot/oauth/callback
```

Required scopes:

```txt
crm.objects.contacts.read
crm.objects.contacts.write
```
