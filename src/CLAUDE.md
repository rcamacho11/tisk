# src/ — Services, Hooks, Types, and Context

This directory is the frontend data layer. It has no UI — only data fetching, state management, and shared types.

## Rules for this directory

- **Services** (`services/`) are plain singleton classes. They call `api` from `../api/client.ts` and return `ApiResponse<T>`. They must never import from React or call hooks.
- **Hooks** (`hooks/`) wrap services for use in React components. `useApi` and `useMutation` in `useApi.ts` are the two primitives — add new hooks only if they need non-trivial React state beyond what those provide.
- **Types** (`types/api.ts`) is the single source of truth for all API entity shapes. Add new interfaces here; do not define entity types inline in screens or services.
- **Never call Supabase tables directly from this directory.** All DB access goes through the edge function via `ApiClient`. The only exception is `AuthContext`, which calls `authService` (which calls the edge function's `/auth` route).

## ApiClient behavior

`api.post / api.get / api.put / api.delete` all return `ApiResponse<T>`. The client automatically unwraps the `{ success, [key]: data }` envelope — if there is exactly one key besides `success`/`error`, it becomes `response.data`. If the edge function returns a custom key (e.g., `tasks`, `friends`), the service may need to do a second unwrap (see `taskService.getTasks()` for the pattern).

A 401 response clears `supabase_access_token` from AsyncStorage automatically.

## Adding a new service

1. Create `src/services/fooService.ts` — export a singleton `export const fooService = new FooService()`.
2. Add entity types and input types to `src/types/api.ts`.
3. Call `api.get / post / put / delete` with the endpoint path (no base URL — `ApiClient` prepends `EXPO_PUBLIC_API_URL`).
4. Wire up the corresponding edge function route in `supabase/functions/rapid-task/index.ts`.
