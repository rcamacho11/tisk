# Frontend Architecture

## Routing

Expo Router (file-based). Entry point is `app/_layout.tsx`, which wraps the whole app in `AuthProvider` and renders `AuthGuard`.

`AuthGuard` is a render-null component that watches `isAuthenticated` from `AuthContext` and calls `router.replace` to enforce:
- Unauthenticated → `/login`
- Authenticated + on `/login` → `/(tabs)`

### Screens

| File | Tab | Description |
|---|---|---|
| `app/(tabs)/index.tsx` | Home | Full task list with CRUD, subtasks, filter/sort |
| `app/(tabs)/explore.tsx` | Map | Leaflet map in a WebView showing user + friend locations |
| `app/(tabs)/profile.tsx` | Profile | Profile editing, friends list, friend requests, settings |
| `app/login.tsx` | — | Login / signup toggle |
| `app/modal.tsx` | — | Unused placeholder modal |

`app/(tabs)/index-tasks.tsx` is a duplicate/older version of the tasks screen — it is not routed anywhere and can be deleted.

## Data Fetching Pattern

Two hooks in `src/hooks/useApi.ts` handle all async state:

**`useApi(callback, deps?)`** — for reads. Fires on mount and when `deps` change. Returns `{ data, loading, error, refetch }`.

```tsx
const { data: tasks, loading, refetch } = useApi(() => taskService.getTasks());
```

**`useMutation(callback)`** — for writes. Does not fire automatically. Returns `{ data, loading, error, mutate }`.

```tsx
const { mutate: createTask } = useMutation((input: CreateTaskInput) => taskService.createTask(input));
const result = await createTask({ title: 'Buy milk', priority: 'low', ... });
```

After a mutation, manually call the relevant `refetch` from a `useApi` call to refresh the list.

## Auth State

`AuthContext` (`src/contexts/AuthContext.tsx`) exposes `{ user, session, isAuthenticated, isLoading, signup, login, logout }`. Consume via `useAuth()` from `src/hooks/useAuth.ts`. The context also re-exports the same hook, so either import path works.

Token storage: `supabase_access_token` in `AsyncStorage`. Written by `AuthContext` on login/signup; read by `ApiClient` on every request; cleared on logout or 401.

## Components

`ThemedText` and `ThemedView` in `components/` adapt to the device color scheme via `useColorScheme`. Use these in any screen that should respect dark mode. `profile.tsx` uses plain RN `Text`/`View` with hardcoded light colors — this is a known inconsistency.

`components/ui/icon-symbol.tsx` has a platform split: `icon-symbol.ios.tsx` for iOS SF Symbols, `icon-symbol.tsx` for cross-platform (Ionicons fallback). Most screens use `@expo/vector-icons` Ionicons directly.

## Map Screen

The map is rendered as a Leaflet HTML page injected into a `react-native-webview`. When the user's location updates, the screen calls `webViewRef.current.injectJavaScript(...)` to pan the map — no full re-render. Friend locations are fetched from the backend and embedded in the initial HTML; when the Supabase Realtime channel fires on the `user_locations` table, `fetchFriendLocations()` runs and re-renders the WebView with a new `key` prop (forcing a full reload with updated friend pins).

Location is pushed to the backend every `3000ms` or `10m` traveled via `Location.watchPositionAsync`. The backend rejects the push if the user's `share_location` setting is false.

## Type Safety Gaps

There are a few `as any` casts in `app/(tabs)/index.tsx` (e.g., `category_id` on the `Task` type). The DB column is `category_id` but the `Task` interface uses `category: string`. Aligning the interface with the actual DB shape would remove these casts.
