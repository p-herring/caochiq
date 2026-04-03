# CoachIQ

Performance coaching intelligence platform. Built with Next.js, Fastify, Supabase, and Strava.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router) |
| Backend | Fastify |
| Database | Supabase (Postgres + Auth + RLS) |
| Integrations | Strava API |
| Hosting | Vercel (web) + Railway (api) |

---

## Getting started locally

### 1. Run the database schema

1. Go to your [Supabase dashboard](https://supabase.com/dashboard)
2. Open your project → **SQL Editor**
3. Paste the contents of `scripts/schema.sql` and click **Run**

This creates all tables, indexes, RLS policies, and triggers.

### 2. Get your Supabase JWT secret

1. Supabase dashboard → **Project Settings** → **JWT Settings**
2. Copy the **JWT Secret**
3. Open `apps/api/.env` and set `SUPABASE_JWT_SECRET=your_secret_here`

### 3. Set up Strava redirect URI

In your [Strava API settings](https://www.strava.com/settings/api):
- Set **Authorization Callback Domain** to `localhost`

For production, update `STRAVA_REDIRECT_URI` in `apps/api/.env` to your Railway URL.

### 4. Start everything

```bash
chmod +x setup.sh
./setup.sh
```

Or manually:

```bash
npm install
npm run build --workspace=packages/shared
npm run dev
```

Visit **http://localhost:3000** — you'll be redirected to the login page.

### 5. Create your coach account

1. Go to http://localhost:3000/login
2. Click "Sign up" and create an account with your email
3. Check your email for the confirmation link (or disable email confirmation in Supabase Auth settings for local dev)
4. Sign in and you'll land on the dashboard

### 6. Add your first athlete

Currently athletes are added directly in Supabase:

1. Supabase dashboard → **Table Editor** → `athletes`
2. Insert a row with:
   - `coach_id`: your user ID (find it in Authentication → Users)
   - `full_name`: athlete's name
   - `email`: athlete's email

An athlete profile row is auto-created by a trigger.

---

## Deploying to beta

### Frontend → Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Set these environment variables in Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://qpebywzqdgyljocyihcq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_API_URL=https://your-railway-api-url.up.railway.app/api/v1
   ```
4. Deploy — Vercel auto-detects Next.js

### Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo
3. Set these environment variables in Railway:
   ```
   PORT=3001
   SUPABASE_URL=https://qpebywzqdgyljocyihcq.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6InNlcnZpY2Vfcm9sZSJ9...
   SUPABASE_JWT_SECRET=your-jwt-secret
   STRAVA_CLIENT_ID=219538
   STRAVA_CLIENT_SECRET=385d3bece9a0fef71016f7bb3499bf444019e72a
   STRAVA_REDIRECT_URI=https://your-railway-url.up.railway.app/api/v1/integrations/strava/callback
   FRONTEND_URL=https://your-vercel-url.vercel.app
   ```
4. Railway will use `railway.toml` to build and start the API

### After deploying

1. Update Strava API settings with your Railway callback URL
2. Update `NEXT_PUBLIC_API_URL` in Vercel to point to your Railway URL
3. Add your Vercel domain to Supabase → **Authentication** → **URL Configuration** → Site URL

---

## Project structure

```
coachiq/
├── packages/
│   └── shared/          # TypeScript types shared between web + api
├── apps/
│   ├── api/             # Fastify backend
│   │   └── src/
│   │       ├── routes/  # athletes, plans, sessions, messages, insights, strava
│   │       ├── lib/     # supabase client
│   │       └── middleware/  # auth
│   └── web/             # Next.js frontend
│       └── src/
│           ├── app/     # pages
│           └── components/
├── scripts/
│   └── schema.sql       # Full DB schema — run once in Supabase
├── railway.toml         # Railway deploy config
├── vercel.json          # Vercel deploy config
└── setup.sh             # Local dev startup script
```

---

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /athletes | List all athletes |
| POST | /athletes | Create athlete |
| GET | /athletes/:id | Get athlete detail |
| PATCH | /athletes/:id/profile | Update profile/notes |
| GET | /athletes/:id/sessions | Get sessions (optional ?week=) |
| GET | /athletes/:id/compliance | Compliance data + chart |
| GET | /athletes/:id/insights | Active flags |
| GET | /athletes/:id/logs | Workout history |
| GET | /athletes/:id/races | Race calendar |
| POST | /plans | Create training plan |
| GET | /plans?athlete_id= | Get active plan |
| GET | /plans/:id | Plan + all sessions |
| PATCH | /plans/:id | Update plan |
| DELETE | /plans/:id | Delete plan |
| GET | /sessions/:id | Session + blocks |
| POST | /sessions | Create session |
| PATCH | /sessions/:id | Update session |
| DELETE | /sessions/:id | Delete session |
| POST | /sessions/:id/blocks | Add block |
| POST | /sessions/:id/blocks/reorder | Reorder blocks |
| GET | /messages?with= | Message thread |
| POST | /messages | Send message |
| GET | /messages/unread-count | Unread count |
| GET | /insights | All active flags |
| POST | /insights/:id/dismiss | Dismiss flag |
| GET | /today | Dashboard overview |
| GET | /integrations/status | Strava connection status |
| GET | /integrations/strava/connect | Get OAuth URL |
| POST | /integrations/strava/sync | Sync activities |
| DELETE | /integrations/strava | Disconnect |
