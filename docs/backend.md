# Backend Documentation

## Overview

All backend logic lives in a single Supabase Edge Function (`rapid-task`) written in Deno/TypeScript. There is no separate Express/Node server. The function is deployed to Supabase's global edge network and is accessed at:

```
https://bkobvzbzhxybcugsuvjq.supabase.co/functions/v1/rapid-task
```

## Edge Function: `rapid-task`

**Location:** `supabase/functions/rapid-task/`

The function is a monolithic request router. It reads the URL path and HTTP method to dispatch to the appropriate handler. All responses are `application/json`.

### Routing Pattern

```typescript
// Pseudo-structure inside the edge function
const path = url.pathname.replace('/rapid-task', '')  // e.g. '/tasks'
const method = req.method

if (path === '/auth') {
  const action = url.searchParams.get('action')  // 'signup' | 'login'
  // handle auth
} else {
  verifyJWT(req)  // throws 401 if invalid
  if (path === '/tasks') { ... }
  if (path.startsWith('/tasks/')) { ... }  // /tasks/:id
  // etc.
}
```

### JWT Verification

For all non-`/auth` routes, the function extracts the `Authorization: Bearer <token>` header and verifies it against Supabase's JWT secret. The decoded payload provides `sub` (user UUID) used to scope all database queries.

### API Reference

All authenticated endpoints require `Authorization: Bearer <jwt>`.

#### Auth (no JWT required — use publishable key as Bearer)

| Method | Path | Query | Body | Description |
|--------|------|-------|------|-------------|
| POST | `/auth` | `action=signup` | `{ email, password, name }` | Create account |
| POST | `/auth` | `action=login` | `{ email, password }` | Sign in |

Response for both: `{ session: { access_token, ... }, user: User }`

#### Tasks

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/tasks` | — | List authenticated user's tasks |
| POST | `/tasks` | `CreateTaskInput` | Create task |
| PUT | `/tasks/:id` | `UpdateTaskInput` | Update task fields |
| DELETE | `/tasks/:id` | — | Delete task |

#### Profile

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/profile` | — | Get own profile |
| PUT | `/profile` | `UpdateProfileInput` | Update profile |

#### Friends

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/friends` | — | List friends |
| POST | `/friends` | `{ username }` | Add friend by username |
| DELETE | `/friends/:id` | — | Remove friend |

#### Settings

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/settings` | — | Get user settings |
| PUT | `/settings` | `UpdateSettingsInput` | Update settings |

#### Location

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/location` | `{ latitude, longitude, accuracy?, address? }` | Upsert current location |

## Database Schema

Tables inferred from the edge function and services:

### `tasks`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES auth.users(id)
title       text NOT NULL
description text
priority    text CHECK (priority IN ('low', 'medium', 'high'))
category    text CHECK (category IN ('Work', 'Personal', 'Shopping', 'Health', 'Finance'))
due_date    timestamptz
completed   boolean DEFAULT false
completed_at timestamptz
created_at  timestamptz DEFAULT now()
updated_at  timestamptz
```

### `profiles`
```sql
id          uuid PRIMARY KEY REFERENCES auth.users(id)
name        text
username    text UNIQUE
avatar_url  text
bio         text
created_at  timestamptz DEFAULT now()
updated_at  timestamptz
```

### `friendships`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES auth.users(id)
friend_id   uuid REFERENCES auth.users(id)
status      text DEFAULT 'accepted'
created_at  timestamptz DEFAULT now()
```

### `user_settings`
```sql
user_id              uuid PRIMARY KEY REFERENCES auth.users(id)
notifications_enabled boolean DEFAULT true
dark_mode            boolean DEFAULT false
privacy_mode         boolean DEFAULT false
updated_at           timestamptz
```

### `user_locations`
```sql
user_id    uuid PRIMARY KEY REFERENCES auth.users(id)
latitude   float8
longitude  float8
accuracy   float8
address    text
updated_at timestamptz DEFAULT now()
```

## Local Development

### Prerequisites
- Docker (for local Supabase)
- Supabase CLI (`npm i -g supabase` or use the devDependency)

### Start local Supabase
```bash
npx supabase start
# Starts PostgreSQL, Auth, Storage, and Edge Functions runtime locally
```

### Serve the edge function locally
```bash
npx supabase functions serve rapid-task --env-file .env.local
# Available at http://localhost:54321/functions/v1/rapid-task
```

For local testing, set `EXPO_PUBLIC_API_URL=http://localhost:54321/functions/v1/rapid-task` in `.env`.

### Deploy to remote
```bash
npx supabase functions deploy rapid-task
```

## Supabase Configuration

`supabase/config.toml` key settings:
- PostgreSQL v17
- JWT expiry: 3600s (1 hour)
- Storage max file size: 50 MiB
- Edge functions runtime: Deno v2
- `rapid-task` function: JWT verification enabled
- Analytics: disabled

## ApiClient (client side)

`src/api/apiClient.ts` is the single point of contact between the app and the edge function. It:
- Reads the JWT from AsyncStorage before each authenticated request
- Sets `Content-Type: application/json` and `Authorization` headers
- Parses JSON responses
- Normalizes errors into `ApiError` shape (`{ message, code?, details? }`)

Do not call `fetch` directly in services — always go through `apiClient`.
