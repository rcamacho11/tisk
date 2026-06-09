# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Tisk?

Tisk is a cross-platform (iOS, Android, Web) task management app built with Expo/React Native and Supabase. Core features: location-aware task assignment, friend collaboration, photo-proof verification, and AI-powered task verification. The app targets multiple use cases: parental chore management, field service verification, remote workforce coordination.

## Detailed Documentation

Specialist docs live in `docs/` — read the relevant one before touching that area:

| Area | File |
|------|------|
| Architecture overview | [`docs/architecture.md`](docs/architecture.md) |
| Backend / Edge Functions / Supabase | [`docs/backend.md`](docs/backend.md) |
| Frontend / Expo Router / screens | [`docs/frontend.md`](docs/frontend.md) |
| Styling / theming / components | [`docs/styling.md`](docs/styling.md) |
| Data models / TypeScript types | [`docs/data-models.md`](docs/data-models.md) |
| Building APK / IPA / release | [`docs/building.md`](docs/building.md) |
| Known bugs & resolutions | [`docs/known-bugs.md`](docs/known-bugs.md) |

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
```

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

## Key Architectural Decisions

- **Single edge function** (`rapid-task`) handles all API routes — no separate microservices.
- **No global state library** — state lives in React hooks (`useAuth`, `useApi`, `useMutation`).
- **Platform-specific files**: use `.ios.tsx` / `.tsx` suffixes for platform variants.
- **TypeScript strict mode** is on — no implicit `any`, no unchecked nulls.
- **Path alias**: `@/*` maps to the repo root (configured in `tsconfig.json`).
