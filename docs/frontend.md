# Frontend Documentation

## Framework & Routing

**Expo SDK ~54** with **Expo Router ~6** (file-based routing, similar to Next.js App Router).

- Every file in `app/` becomes a route.
- `_layout.tsx` files define layout wrappers and navigation structure.
- `(tabs)/` is a route group — it renders a bottom tab navigator without the group name appearing in the URL.
- Platform-specific files: `ComponentName.ios.tsx` is used on iOS, `ComponentName.tsx` on all other platforms.

## Navigation

```
app/
├── _layout.tsx          # Root Stack layout
│                        # Checks auth → redirects to login if no session
├── login.tsx            # Unified auth screen (login + signup toggled by state)
├── modal.tsx            # Example modal route
└── (tabs)/
    ├── _layout.tsx      # Bottom tab navigator (3 visible tabs)
    ├── index.tsx        # Tab 1: Home — task list + CRUD
    ├── explore.tsx      # Tab 2: Explore — map + location
    └── profile.tsx      # Tab 3: Profile — user info, friends, settings
```

The root `_layout.tsx` wraps the app in `useAuth()` and uses `<Redirect>` to enforce auth. Any screen inside `(tabs)/` assumes a valid session exists.

## Screens

### Login (`app/login.tsx`)
- Single screen with local `isSignUp` toggle.
- Form state: `email`, `password`, `name` (signup only), `confirmPassword` (signup only).
- Calls `authService.signup()` or `authService.login()` directly (not through a mutation hook — simplification because the auth result drives navigation).
- On success: sets session in `useAuth`, Expo Router redirects via the root layout.

### Home / Tasks (`app/(tabs)/index.tsx`)
The most feature-rich screen.

**State:** local `useState` for filters, sort, modal visibility, and the currently edited task.

**Data:** `useApi(taskService.getTasks)` for the task list, `useMutation` for each write operation.

**Features:**
- Filter bar: All / Active / Completed
- Sort controls: date / priority / category
- Task cards with overdue highlighting (red), completion toggle, edit/delete swipe or button
- Progress summary: "X of Y completed"
- Floating action button → opens create modal
- Task form modal (shared for create and edit): title, description, priority, category, due date

**Priority levels (string literals, not enum):** `'low' | 'medium' | 'high'`

**Category values:** `'Work' | 'Personal' | 'Shopping' | 'Health' | 'Finance'`

### Explore / Map (`app/(tabs)/explore.tsx`)
- Requests `Location.requestForegroundPermissionsAsync()` on mount.
- Uses `expo-location` to get coordinates.
- Renders map via **WebView** + Leaflet (OpenStreetMap tiles). The HTML/JS for Leaflet is injected as a string into the WebView — not a native map component.
- Reverse geocodes coordinates to a human-readable address.
- "Open in Maps" button links to Apple Maps / Google Maps / web map based on platform.
- Location is also posted to the backend via `locationService.postLocation()`.

### Profile (`app/(tabs)/profile.tsx`)
- Loads profile, friends list, and settings in parallel with three `useApi` calls.
- Edit profile modal: name, bio fields.
- Add friend: text input for username, calls `friendService.addFriend({ username })`.
- Settings display: shows current notification/dark mode/privacy values (read-only in current UI — settings edit not yet implemented).
- Logout button calls `authService.logout()` and clears AsyncStorage.

## Hooks

### `useAuth()` — `src/hooks/useAuth.ts`
```typescript
const { session, user, login, signup, logout, loading } = useAuth()
```
- `session` — current Supabase session or `null`
- Persists session to AsyncStorage; re-hydrates on app start
- `login(email, password)` / `signup(email, password, name)` / `logout()`

### `useApi(fetchFn)` — `src/hooks/useApi.ts`
```typescript
const { data, loading, error, refetch } = useApi(() => taskService.getTasks())
```
- Calls `fetchFn` on mount and whenever `refetch()` is called.
- `data` starts as `null` until first successful fetch.
- `error` is `ApiError | null`.

### `useMutation(mutateFn)` — `src/hooks/useApi.ts` (same file)
```typescript
const { mutate, loading, error } = useMutation(taskService.createTask)
// ...
await mutate(input)   // returns the result or throws
```
- Does NOT auto-refetch; caller must call `refetch()` after success.
- `loading` becomes `true` while the request is in-flight.

## Key Components

All reusable components live in `components/`. Platform-specific variants use `.ios.tsx` suffix.

| Component | Purpose |
|-----------|---------|
| `ThemedText` | `<Text>` that reads colors from `useThemeColor()` |
| `ThemedView` | `<View>` with theme-aware background |
| `HapticTab` | Tab bar button that fires haptic feedback on press |
| `IconSymbol` | Wraps `@expo/vector-icons`; resolves SF Symbols on iOS, MaterialIcons on Android/Web |
| `ParallaxScrollView` | Scroll view with a parallax hero image at the top |
| `ExternalLink` | Opens URLs in the in-app browser via `expo-web-browser` |
| `Collapsible` | Accordion / expandable section |

## Path Alias

`@/*` resolves to the repo root. Use it for imports from `src/`, `constants/`, `components/`:

```typescript
import { ThemedText } from '@/components/ThemedText'
import { useAuth } from '@/src/hooks/useAuth'
import Colors from '@/constants/theme'
```

## Platform Targets

The app targets three platforms via Expo:
- **iOS** — tested via Expo Go or simulator
- **Android** — tested via Expo Go or emulator
- **Web** — `react-native-web` adapter; served by Metro bundler

Some features (haptics, native maps) are conditionally disabled or polyfilled on Web.

## Adding a New Screen

1. Create `app/(tabs)/newscreen.tsx` or `app/newscreen.tsx` for non-tab screens.
2. Add a tab entry in `app/(tabs)/_layout.tsx` if it's a tab.
3. Fetch data with `useApi`, mutate with `useMutation`.
4. Add service functions to the appropriate file in `src/services/` and wire up the endpoint in `supabase/functions/rapid-task/`.
