# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────┐
│           Expo App (Client)             │
│  app/(tabs)/   components/   src/       │
│                                         │
│  Expo Router → Screens                  │
│  Screens → Hooks (useAuth, useApi)      │
│  Hooks → Services (authService, etc.)   │
│  Services → ApiClient (src/api/)        │
└───────────────┬─────────────────────────┘
                │ HTTPS (JWT Bearer)
                ▼
┌─────────────────────────────────────────┐
│  Supabase Edge Function: rapid-task     │
│  (Deno/TypeScript, single function)     │
│                                         │
│  Routes: /auth /tasks /profile          │
│          /friends /settings /location   │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Supabase PostgreSQL (hosted)           │
│  Tables: tasks, profiles, friendships,  │
│          user_settings, user_locations  │
│                                         │
│  Supabase Auth (JWT, 1hr expiry)        │
│  Supabase Storage (media uploads)       │
└─────────────────────────────────────────┘
```

## Layer Responsibilities

### `app/` — Expo Router screens (view layer)
File-system routing. Each file is a route. Screens are thin: they call hooks, render data, fire mutations on user events. No business logic here.

### `src/services/` — service layer (business logic)
Each service owns one domain. Services call `apiClient` and return typed results. They are plain async functions, not classes.

| Service | Domain |
|---------|--------|
| `authService.ts` | Signup, login, logout, session retrieval |
| `taskService.ts` | Task CRUD |
| `profileService.ts` | Profile read/write |
| `friendService.ts` | Friend add/remove/list |
| `settingsService.ts` | User settings read/write |
| `subtaskService.ts` | Subtask operations (partially implemented) |
| `locationService.ts` | Location posting |

### `src/hooks/` — React state wrappers
- `useAuth()` — session state, exposes `login`, `signup`, `logout`; persists session in AsyncStorage
- `useApi(fn)` — wraps a service GET function; returns `{ data, loading, error, refetch }`
- `useMutation(fn)` — wraps a service mutating function; returns `{ mutate, loading, error }`

### `src/api/apiClient.ts` — HTTP client
Centralized fetch wrapper. Reads the JWT from AsyncStorage before every authenticated request. Attaches `Authorization: Bearer <token>` header. Handles JSON parse, error normalization. Two request modes:
- Public (auth routes): sends the publishable Supabase key as bearer
- Authenticated: sends the user's JWT

### `supabase/functions/rapid-task/` — backend
Single Deno edge function. Routes requests by path + method. Validates JWT for all non-auth routes using Supabase's JWT secret. Queries Postgres directly via the Supabase client initialized with the service-role key.

## Authentication Flow

```
1. User submits credentials → authService.login()
2. → POST /auth?action=login (public, no JWT required)
3. ← Supabase returns { session: { access_token, ... }, user }
4. Token stored in AsyncStorage
5. Subsequent requests: ApiClient reads token, sets Authorization header
6. Edge function: verifies JWT signature, extracts user.id for RLS
```

Session is re-hydrated from AsyncStorage on app start inside `useAuth`.

## Navigation Structure

```
app/
├── _layout.tsx          ← Root layout; redirects to login if no session
├── login.tsx            ← Unified login + signup screen
└── (tabs)/
    ├── _layout.tsx      ← Bottom tab bar (3 tabs)
    ├── index.tsx        ← "Home" — My Tasks (primary screen)
    ├── explore.tsx      ← Map + location tracking
    └── profile.tsx      ← Profile, friends, settings
```

The `_layout.tsx` at root checks `useAuth().session` and guards routes — unauthenticated users always land on `login.tsx`.

## Data Flow (mutation example: create task)

```
index.tsx (form submit)
  → taskService.createTask(input)        # src/services/taskService.ts
    → apiClient.post('/tasks', body)     # src/api/apiClient.ts
      → POST rapid-task/tasks            # supabase/functions/rapid-task/
        → supabase.from('tasks').insert()
        ← { data: Task }
      ← HTTP 200 JSON
    ← Task object
  ← Task object
index.tsx: refetch task list, close modal
```
