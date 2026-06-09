# rapid-task Edge Function

This is a Deno function — not Node.js. All imports must be URL-based or from `https://esm.sh/`.

## Runtime rules

- Import npm packages via `https://esm.sh/<package>@<version>` (e.g., the Supabase client).
- No `require()`, no CommonJS.
- Use `Deno.env.get()` for environment variables.
- The function is deployed to Supabase Edge Functions and runs on Deno Deploy.

## How routing works

The function strips `/rapid-task` from the URL path, then matches against the remainder with `if/else` chains — no router framework. String equality for simple paths, regex for parameterized paths:

```ts
const endpoint = extractEndpoint(url.pathname) // e.g. '/tasks/abc-123'
const action = url.searchParams.get('action')   // used only for /auth

if (endpoint === '/tasks' && req.method === 'GET') { ... }

const taskMatch = endpoint.match(/^\/tasks\/([^/]+)$/)
if (taskMatch && req.method === 'PUT') {
  const taskId = taskMatch[1]
  ...
}
```

Always check both the endpoint path AND `req.method`.

## Auth

`getAuthUser(req)` verifies the JWT and returns a `userId` string, or `null`. Every protected route must call this and return 401 if null. The Supabase client uses the **service role key** — it bypasses RLS, so user scoping (`.eq('user_id', userId)`) must be done explicitly in every query.

## Response format

Always use `jsonResponse()`:

```ts
return jsonResponse({ success: true, data })        // 200
return jsonResponse({ success: false, error: '...' }, 400)
```

The entity key in the response matters: `ApiClient` on the frontend unwraps the response by looking for a single non-`success`/non-`error` key. Use `data` for single items and for consistency unless there is already a convention (e.g., `tasks`, `friends`, `categories` for list endpoints).

## CORS

All responses must go through `jsonResponse()` which includes `corsHeaders`. OPTIONS preflight is handled at the top of `Deno.serve`. Never return a raw `Response` without the CORS headers.

## Adding a new endpoint

1. Add a handler block in `index.ts` following the existing pattern.
2. Place it in the correct section (Auth / Tasks / Subtasks / Categories / Friends / Location / Profile / Settings).
3. For protected routes, always call `getAuthUser(req)` first — reuse the `userId` already resolved above the route sections if you're adding inside the protected zone.
4. Use `parseBody(req)` to read the request JSON body (returns `{}` on parse failure, so check required fields).
5. Mirror the new endpoint in `src/services/` on the frontend.

## Local dev

```bash
supabase functions serve rapid-task   # hot-reloads on save
supabase functions deploy rapid-task  # production deploy
```

Set `SUPABASE_SERVICE_ROLE_KEY` in `supabase/functions/rapid-task/.env` (never commit this file).
