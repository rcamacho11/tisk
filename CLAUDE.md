# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tisk is a location-aware task management React Native app built with Expo and Supabase. Core features include collaborative task management, location-based task assignments, and AI-powered photo verification of task completion.

## Development Commands

```bash
# Start dev server (opens Expo Go QR code)
npm start

# Platform-specific
npm run ios
npm run android
npm run web

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

### Frontend (Expo Router — file-based routing)

- `app/_layout.tsx` — Root layout; wraps the app in `AuthContext` and redirects unauthenticated users to `/login`
- `app/(tabs)/` — Main tab screens: home/tasks (`index.tsx`), explore/friends (`explore.tsx`), profile (`profile.tsx`)
- `app/login.tsx` — Login/signup screen

### Backend (Single Supabase Edge Function)

All API calls route through one Deno function at `supabase/functions/rapid-task/index.ts`. It handles auth (`POST /auth?action=signup|login`) and all CRUD for tasks, subtasks, profiles, friends, locations, categories, and settings.

The frontend calls this function via `EXPO_PUBLIC_API_URL` using the custom `ApiClient` in `src/api/client.ts`.

### Source Layout (`src/`)

| Directory | Purpose |
|---|---|
| `src/api/client.ts` | Generic fetch wrapper used by all services |
| `src/config/env.ts` | Reads `EXPO_PUBLIC_*` env vars |
| `src/contexts/AuthContext.tsx` | Global auth state via React Context |
| `src/hooks/useAuth.ts` | Hook to consume AuthContext |
| `src/services/` | One service file per domain (auth, tasks, subtasks, friends, location, profile, categories, settings) |
| `src/types/api.ts` | Shared TypeScript interfaces for all API entities |

### Data Flow

1. UI → service (e.g. `taskService.ts`)
2. Service → `ApiClient.post/get/put/delete`
3. ApiClient → `rapid-task` edge function (authenticated via bearer token from AuthContext)
4. Edge function → Supabase PostgreSQL

### Supabase Client

`utils/supabase.ts` initializes the Supabase JS client using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. This is used for direct Supabase operations (auth session management, realtime) while heavier CRUD goes through the edge function.

## Environment Variables

Copy `.env` and fill in values:

```
EXPO_PUBLIC_API_URL=          # Edge function URL
EXPO_PUBLIC_SUPABASE_URL=     # Supabase project URL
EXPO_PUBLIC_SUPABASE_KEY=     # Publishable key
EXPO_PUBLIC_SUPABASE_ANON_KEY= # Anon key (JWT)
```

The edge function also requires `SUPABASE_SERVICE_ROLE_KEY` set in `supabase/functions/rapid-task/.env` (never commit this).

## Key Conventions

- All screens are TypeScript (`.tsx`). Shared types live in `src/types/api.ts` — add new entity types there.
- Services are plain classes/functions, not hooks. Hooks (in `src/hooks/`) wrap services for React component use.
- `EXPO_PUBLIC_` prefix is required for any env var accessible in the Expo bundle.
- The edge function is the single source of truth for database access — avoid calling Supabase tables directly from the frontend except for auth session management.
