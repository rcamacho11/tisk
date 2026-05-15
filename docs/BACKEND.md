# Backend Architecture

## Overview

All CRUD goes through a single Deno edge function at `supabase/functions/rapid-task/index.ts`. It uses the Supabase JS client initialized with the **service role key** — it bypasses RLS and enforces its own user-scoping in every query.

## Auth

`POST /auth?action=signup` and `POST /auth?action=login` are the only public routes. They use the Supabase anon key as the `Authorization: Bearer` header (set by `ApiClient` for unauthenticated requests).

All other routes call `getAuthUser(req)`, which extracts the JWT from `Authorization: Bearer`, calls `supabase.auth.getUser(token)`, and returns the `user.id` or `null`. A `null` result returns 401.

## Routing

The function strips the `/rapid-task` prefix from the pathname and matches the remainder against string equality or regex:

```
endpoint = pathname.replace(/\/rapid-task(.*)/, '$1') || '/'
```

Route matching is done with `if/else` chains — there is no router framework. Regex patterns used:

| Pattern | Matches |
|---|---|
| `/^\/tasks\/([^/]+)$/` | `/tasks/:id` |
| `/^\/tasks\/([^/]+)\/subtasks$/` | `/tasks/:id/subtasks` |
| `/^\/subtasks\/([^/]+)$/` | `/subtasks/:id` |
| `/^\/categories\/([^/]+)$/` | `/categories/:id` |
| `/^\/friends\/([^/]+)$/` | `/friends/:id` |

## API Endpoints

### Auth (public)
| Method | Endpoint | Action param | Description |
|---|---|---|---|
| POST | `/auth` | `signup` | Create account |
| POST | `/auth` | `login` | Sign in, returns session |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks` | List user's tasks |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task (title, description, priority, dueDate, completed, category_id) |
| DELETE | `/tasks/:id` | Delete task |

### Subtasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks/:id/subtasks` | List subtasks for a task |
| POST | `/tasks/:id/subtasks` | Create subtask |
| PUT | `/subtasks/:id` | Update subtask |
| DELETE | `/subtasks/:id` | Delete subtask |

### Categories
| Method | Endpoint | Description |
|---|---|---|
| GET | `/categories` | List user's categories |
| POST | `/categories` | Create category (`name`, optional `color`) |
| DELETE | `/categories/:id` | Delete category |

### Friends
| Method | Endpoint | Description |
|---|---|---|
| GET | `/friends` | List accepted friends (with profile data) |
| GET | `/friends/requests` | List pending incoming friend requests |
| POST | `/friends` | Send friend request by `username` |
| PUT | `/friends/:id` | Accept or reject a request (`status: accepted\|rejected`, addressee only) |
| DELETE | `/friends/:id` | Unfriend or cancel request (either party) |

### Location
| Method | Endpoint | Description |
|---|---|---|
| POST | `/location` | Upsert current user's location (403 if `share_location` is false) |
| GET | `/location/friends` | Get accepted friends' locations (filtered to `share_location = true`) |

### Profile
| Method | Endpoint | Description |
|---|---|---|
| GET | `/profile` | Get own profile |
| PUT | `/profile` | Update profile (username, name, bio, avatar_url) |

### Settings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/settings` | Get own settings |
| PUT | `/settings` | Update settings (notifications_enabled, dark_mode, private_profile, show_online_status, share_location) |

## Database Tables (inferred)

| Table | Key columns |
|---|---|
| `tasks` | `id`, `user_id`, `title`, `description`, `priority`, `category_id`, `due_date`, `completed` |
| `subtasks` | `id`, `task_id`, `title`, `completed` |
| `categories` | `id`, `user_id`, `name`, `color` |
| `friends` | `id`, `requester_id`, `addressee_id`, `status` (`pending`/`accepted`/`rejected`) |
| `profiles` | `user_id`, `username`, `name`, `bio`, `avatar_url`, `updated_at` |
| `user_settings` | `user_id`, `notifications_enabled`, `dark_mode`, `private_profile`, `show_online_status`, `share_location` |
| `user_locations` | `user_id`, `latitude`, `longitude`, `address`, `accuracy`, `updated_at` (unique on `user_id`) |

## Response Envelope

Every response is `{ success: boolean }` plus either an entity key or `error`:

```json
{ "success": true, "tasks": [...] }
{ "success": false, "error": "Unauthorized" }
```

`ApiClient` unwraps this automatically: if there is exactly one key besides `success`/`error`, it is promoted to `response.data`. The exception is `taskService.getTasks()`, which does its own unwrapping because the envelope key is `tasks` (not `data`).

## Adding a New Endpoint

1. Add the handler block in `index.ts` (match method + endpoint string/regex, call supabase, return `jsonResponse`).
2. Add a method to the relevant service in `src/services/`.
3. Add any new types to `src/types/api.ts`.
4. Deploy: `supabase functions deploy rapid-task`.
