# Carbon Commit

Carbon Commit is a full-stack sustainability tracking platform for campus teams. It lets authenticated users record department activity, calculates carbon impact, compares usage against baseline quotas, and surfaces analytics and leaderboards for sustainability reporting.

The project is split into a Vite React frontend, an Express + TypeScript backend, and a Prisma-managed PostgreSQL schema connected to Supabase.

## What the app does

- Authenticates users with Supabase Auth.
- Protects the dashboard and API routes with bearer-token validation.
- Lets users submit department activity logs with units and activity type.
- Calculates CO2e from reference emission factors stored in the database.
- Aggregates department analytics, baseline variance, and leaderboard rankings.
- Seeds reference departments and emission factors for a working demo dataset.

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS, Recharts, Supabase JS
- Backend: Express 5, TypeScript, Zod, Supabase JS
- Database: PostgreSQL on Supabase
- ORM and schema management: Prisma

## Repository Layout

```text
Carbon Commit/
├── README.md
├── prisma.config.ts
├── backend/
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       ├── lib/
│       ├── middleware/
│       ├── routes/
│       └── services/
└── frontend/
    ├── package.json
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── components/
        ├── lib/
        ├── styles/
        └── types.ts
```

## Application Flow

1. The user signs up or signs in with Supabase Auth in the frontend.
2. The frontend keeps the session and attaches the access token to API requests.
3. The backend validates the bearer token with Supabase before allowing protected routes.
4. The backend reads and writes data through Prisma against the Supabase PostgreSQL database.
5. Analytics and leaderboard data are derived from department baselines and logged emissions.

## Core Features

### Authentication

The frontend uses Supabase Auth for sign in and sign up. Protected screens are gated by session state, and backend routes require a valid bearer token.

### Activity Logging

Users can record a department, activity type, and number of units. The backend validates the payload, looks up the matching emission factor, and stores a calculated CO2e result.

### Analytics and Leaderboard

The API exposes department analytics, usage variance, and ranked leaderboard data. The UI renders this with charts and summary cards.

### Seeded Reference Data

The repository includes a seed script that creates demo departments and emission factors so the dashboard is usable immediately after database sync.

## Dashboard Snapshots

The images below were captured from the running frontend during development.

### Overview

![Carbon Commit authenticated dashboard](docs/snapshots/dashboard-live.svg)

### Auth Screen

![Carbon Commit sign in screen](docs/snapshots/auth-live.svg)

## Table DFD
![Carbon Commit Table Architecture](docs/snapshots/supabase-schema-ssnbnsockfjgsheigkbv.png)

## Backend Details

The backend lives in [backend/src](backend/src) and is started from [backend/src/server.ts](backend/src/server.ts).

Important backend pieces:

- [backend/src/app.ts](backend/src/app.ts) wires Express, CORS, JSON parsing, the health endpoint, auth middleware, and API routers.
- [backend/src/middleware/requireAuth.ts](backend/src/middleware/requireAuth.ts) validates Supabase bearer tokens.
- [backend/src/routes/logs.ts](backend/src/routes/logs.ts) handles activity log creation.
- [backend/src/routes/analytics.ts](backend/src/routes/analytics.ts) returns analytics, reference data, and leaderboard data.
- [backend/src/routes/leaderboard.ts](backend/src/routes/leaderboard.ts) exposes the leaderboard endpoint.
- [backend/src/services/activity.service.ts](backend/src/services/activity.service.ts) contains the carbon calculations and aggregation logic.
- [backend/prisma/schema.prisma](backend/prisma/schema.prisma) defines the database models.
- [backend/prisma/seed.ts](backend/prisma/seed.ts) seeds departments and emission factors.

### Backend Scripts

From the backend directory:

- `npm run dev` starts the backend in watch mode.
- `npm run build` compiles the backend TypeScript.
- `npm run start` runs the built server from `dist`.
- `npm run prisma:generate` generates the Prisma client.
- `npm run prisma:migrate` runs Prisma migrate dev.
- `npm run seed` runs the database seed script.

## Frontend Details

The frontend lives in [frontend/src](frontend/src) and is bootstrapped from [frontend/src/main.tsx](frontend/src/main.tsx).

Important frontend pieces:

- [frontend/src/App.tsx](frontend/src/App.tsx) renders the protected app shell.
- [frontend/src/components/ProtectedDashboard.tsx](frontend/src/components/ProtectedDashboard.tsx) loads the session and gates access.
- [frontend/src/components/AuthScreen.tsx](frontend/src/components/AuthScreen.tsx) handles sign in and sign up.
- [frontend/src/components/Dashboard.tsx](frontend/src/components/Dashboard.tsx) contains the main sustainability dashboard.
- [frontend/src/lib/api.ts](frontend/src/lib/api.ts) wraps authenticated API calls.
- [frontend/src/lib/supabase.ts](frontend/src/lib/supabase.ts) creates the browser Supabase client.

### Frontend Scripts

From the frontend directory:

- `npm run dev` starts the Vite dev server.
- `npm run build` type-checks and builds the frontend for production.
- `npm run preview` previews the production build locally.

## Environment Variables

### Backend Environment

Create [backend/.env](backend/.env) with the following values:

- `DATABASE_URL`: Prisma runtime connection string.
- `DIRECT_URL`: Prisma direct or session-pooler connection string for schema operations.
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_ANON_KEY`: Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for backend auth checks and privileged operations.
- `PORT`: Backend port, defaults to `4000`.

The backend is configured through [backend/src/config/env.ts](backend/src/config/env.ts).

### Frontend Environment

Create [frontend/.env](frontend/.env) from [frontend/.env.example](frontend/.env.example):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

The frontend Supabase client prefers `VITE_SUPABASE_PUBLISHABLE_KEY` and falls back to `VITE_SUPABASE_ANON_KEY` for compatibility.

## Supabase and Prisma Setup

This repo uses two different database connection patterns:

- `DATABASE_URL` is the main runtime connection used by Prisma Client.
- `DIRECT_URL` is the connection Prisma uses for schema operations such as pushes and migrations.

For Supabase, the usual pattern is:

- Transaction pooler for runtime traffic.
- Direct connection or session pooler for schema operations.

In some environments, the direct Supabase host is not reachable from the local machine. In that case, a reachable session pooler can be used for local schema sync and seeding.

The repo includes a Prisma config file at [prisma.config.ts](prisma.config.ts) to support current Prisma CLI behavior.

## Database Models

The Prisma schema defines three tables:

- `DeptMaster`: department names and baseline emission quotas.
- `EmissionRef`: activity types, factors, and units.
- `ActivityLogs`: recorded department activity and calculated CO2e.

These map to the following database tables:

- `dept_master`
- `emission_ref`
- `activity_logs`

## Seed Data

The seed script inserts demo data for four departments and four emission factors:

- Computer Engineering
- Mechanical Engineering
- Electrical Engineering
- Civil Engineering

Seeded activity types:

- Electricity
- Water
- Fuel
- Waste

## Local Development

### 1. Install dependencies

Install packages separately in each app folder:

- In `backend/`, run `npm install`.
- In `frontend/`, run `npm install`.

### 2. Configure backend environment

Set up [backend/.env](backend/.env) with your Supabase connection details and secrets.

### 3. Configure frontend environment

Copy [frontend/.env.example](frontend/.env.example) to [frontend/.env](frontend/.env) and fill in your project values.

### 4. Sync the schema

From `backend/`, run:

```bash
npm run prisma:generate
npx prisma db push
```

If you have a reachable direct database connection, you can also use Prisma migrations with `npm run prisma:migrate`.

### 5. Seed the database

From `backend/`, run:

```bash
npm run seed
```

### 6. Start the backend

From `backend/`, run:

```bash
npm run dev
```

The backend starts on the port defined by `PORT`, usually `http://localhost:4000`.

### 7. Start the frontend

From `frontend/`, run:

```bash
npm run dev
```

Then open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## API Endpoints

### Public

- `GET /health` returns a basic service health check.

### Protected

All protected routes require a valid Supabase bearer token.

- `POST /logs` creates a new activity log.
- `GET /analytics` returns department analytics.
- `GET /analytics/reference-data` returns department and activity reference data.
- `GET /analytics/leaderboard` returns leaderboard data.
- `GET /leaderboard` returns the leaderboard data directly.

### Request Shape

For `POST /logs`, the backend expects:

- `deptId`: positive integer
- `activityType`: non-empty string
- `units`: positive number

## Troubleshooting

### Prisma cannot reach the database

If Prisma reports `P1001` or similar connection errors, the local machine may not be able to reach the direct Supabase host. Try a reachable session pooler URL for schema sync, or run the command from a network that can reach the direct database endpoint.

### Seed fails with missing tables

Run the schema sync first so the tables exist before seeding. The seed script expects `dept_master` and `emission_ref` to be present.

### Auth requests return 401

Make sure the frontend is using the correct Supabase project URL and publishable key, and that the access token is being attached to requests.

### API requests fail from the frontend

Confirm `VITE_API_BASE_URL` points at the backend server and that the backend is running.

## Notes on RLS

Supabase Row Level Security is useful for direct Supabase client access, but Prisma-backed access through the backend is still controlled by the database credentials used by Prisma. The current architecture uses Supabase Auth to protect the API, while Prisma handles the data model and queries.

## Suggested Next Steps

- Add screenshots or a short demo GIF to show the dashboard in action.
- Expand the seed data for more realistic campuses or departments.
- Replace any remaining Prisma deprecation warnings by fully adopting the current Prisma config workflow.
