# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tisk is a location-aware task management React Native app built with Expo and Supabase. Core features include task/subtask management, real-time friend location sharing on a map, a friend request system, and per-user settings. AI photo verification of task completion is planned but not yet implemented.

See `docs/` for deep-dives:
- [`docs/PURPOSE.md`](docs/PURPOSE.md) — goals, target users, planned features
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — screens, hooks, routing, component conventions
- [`docs/BACKEND.md`](docs/BACKEND.md) — edge function routes, DB tables, auth flow
- [`docs/STYLE.md`](docs/STYLE.md) — colors, theming, styling conventions
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what's built, what's missing, known gaps

## Development Commands

```bash
# Start dev server (Expo Go QR code)
npm start

# Platform-specific native builds
npm run ios
npm run android

# Lint
npm run lint
```

### Supabase / Backend

```bash
supabase start                          # Start local Supabase stack
supabase functions serve rapid-task     # Run edge function locally
supabase functions deploy rapid-task    # Deploy edge function
supabase db push                        # Push migrations
supabase db reset                       # Reset DB with migrations + seed
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

```
EXPO_PUBLIC_API_URL=           # Edge function URL (required by ApiClient)
EXPO_PUBLIC_SUPABASE_URL=      # Supabase project URL
EXPO_PUBLIC_SUPABASE_KEY=      # Publishable key (used as Bearer for public routes)
EXPO_PUBLIC_SUPABASE_ANON_KEY= # Anon key (JWT) for Supabase JS client
```

Edge function requires `SUPABASE_SERVICE_ROLE_KEY` in `supabase/functions/rapid-task/.env`.

## Key Conventions

- All new entity types belong in `src/types/api.ts`.
- Services are plain classes/singletons — never hooks. Hooks in `src/hooks/` wrap services for React.
- Use `useApi` for read-only fetches and `useMutation` for writes — both from `src/hooks/useApi.ts`.
- Adding a new backend endpoint: add the route handler in `supabase/functions/rapid-task/index.ts`, add a method to the relevant service, add types to `src/types/api.ts`.
- `EXPO_PUBLIC_` prefix is required for any env var used in the Expo bundle.
