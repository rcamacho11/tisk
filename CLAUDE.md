# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Tisk?

Tisk is a cross-platform (iOS, Android, Web) task management app built with Expo/React Native and Supabase. Core features: location-aware task assignment, friend collaboration, photo-proof verification, and AI-powered task verification. The app targets multiple use cases: parental chore management, field service verification, remote workforce coordination.

## Detailed Documentation

Specialist docs live in `docs/` — read the relevant one before touching that area:

- [`docs/PURPOSE.md`](docs/PURPOSE.md) — goals, target users, planned features
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — screens, hooks, routing, component conventions
- [`docs/BACKEND.md`](docs/BACKEND.md) — edge function routes, DB tables, auth flow
- [`docs/STYLE.md`](docs/STYLE.md) — colors, theming, styling conventions
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what's built, what's missing, known gaps

## Commands

```bash
# Install dependencies
npm install

# Start the Expo dev server (interactive — press a/i/w for Android/iOS/Web)
npx expo start

# Run on Android emulator
npx expo run:android

# Run on iOS simulator
npx expo run:ios

# Type-check
npx tsc --noEmit

# Lint
npx expo lint

# Start local Supabase (requires Docker)
npx supabase start

# Deploy edge function to remote Supabase
npx supabase functions deploy rapid-task

# Serve edge function locally for development
npx supabase functions serve rapid-task --env-file .env.local

# Push migrations
supabase db push

# Reset DB with migrations + seed
supabase db reset
```

## Architecture

### Request Flow

```
UI screen
  → service (src/services/*.ts)
    → ApiClient (src/api/client.ts)   — attaches auth token from AsyncStorage
      → rapid-task edge function       — validates JWT, talks to Postgres
        → Supabase PostgreSQL
```

The edge function is the only path for database writes. The frontend Supabase client (`utils/supabase.ts`) is used only for Realtime subscriptions (location updates) — not for direct table queries.

### Auth Token Storage

`supabase_access_token` is stored in `AsyncStorage` and read by `ApiClient.getAuthToken()` on every request. The token is written on login/signup and cleared on logout or 401 response. `AuthContext` is the single source of auth state in the app.

### Edge Function Response Envelope

All responses follow `{ success: boolean, [entity]: data | error: string }`. `ApiClient` unwraps this — if there is exactly one key besides `success`/`error`, it is extracted as the returned `data`. Services should not need to unwrap manually, but `taskService` does its own unwrapping because the envelope key is `tasks` (plural) rather than `data`.

### Routing

Expo Router with file-based routing. `AuthGuard` in `app/_layout.tsx` redirects unauthenticated users to `/login` and authenticated users away from `/login`. The anchor screen is `login`.

## Environment Variables

Two env files are required:

**.env** — client-side runtime vars (EXPO_PUBLIC_* prefix exposes them to the app):
```
EXPO_PUBLIC_API_URL=https://<project>.supabase.co/functions/v1/rapid-task
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**.env.local** — used by Supabase CLI for local function serving:
```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
```

Edge function requires `SUPABASE_SERVICE_ROLE_KEY` in `supabase/functions/rapid-task/.env`.

## Key Conventions

- **Single edge function** (`rapid-task`) handles all API routes — no separate microservices.
- **No global state library** — state lives in React hooks (`useAuth`, `useApi`, `useMutation`).
- **Platform-specific files**: use `.ios.tsx` / `.tsx` suffixes for platform variants.
- **TypeScript strict mode** is on — no implicit `any`, no unchecked nulls.
- **Path alias**: `@/*` maps to the repo root (configured in `tsconfig.json`).
- All new entity types belong in `src/types/api.ts`.
- Services are plain classes/singletons — never hooks. Hooks in `src/hooks/` wrap services for React.
- Use `useApi` for read-only fetches and `useMutation` for writes — both from `src/hooks/useApi.ts`.
- Adding a new backend endpoint: add the route handler in `supabase/functions/rapid-task/index.ts`, add a method to the relevant service, add types to `src/types/api.ts`.
- `EXPO_PUBLIC_` prefix is required for any env var used in the Expo bundle.
