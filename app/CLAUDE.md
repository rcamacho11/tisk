# app/ — Screens (Expo Router)

This directory contains only screens and the root layout. All data fetching, types, and services live in `src/`.

## Import alias

Use `@/` for all imports from the project root:

```ts
import { ThemedText } from '@/components/themed-text'
import { useApi } from '@/src/hooks/useApi'
import { taskService } from '@/src/services/taskService'
```

## Screen conventions

- Every screen is a default export React function component.
- Styles go in a `StyleSheet.create({})` call at the bottom of the file.
- Use `useApi` for data fetches and `useMutation` for writes (from `@/src/hooks/useApi`).
- After a mutation, call the relevant `refetch` from `useApi` to refresh the list — there is no global cache.
- `Alert.alert('Error', error.message)` is the standard way to surface API errors to the user.

## Theming

Use `ThemedText` and `ThemedView` from `@/components/` in any screen that should respect dark/light mode. These use `useColorScheme()` internally. Pass inline style overrides as needed — both accept a `style` prop.

`profile.tsx` is an exception — it uses plain RN `Text`/`View` with hardcoded colors. Don't extend that pattern in new screens.

## Routing

Expo Router file-based:
- Files in `(tabs)/` are tab screens; their tab bar config is in `(tabs)/_layout.tsx`.
- `_layout.tsx` at the root wraps everything in `AuthProvider` and `AuthGuard`.
- `AuthGuard` handles redirect logic — do not add navigation guards inside individual screens.
- Use `router.replace('/login')` for logout; `router.push` for forward navigation.

## Auth access in screens

```ts
import { useAuth } from '@/src/hooks/useAuth'
const { user, logout, isAuthenticated } = useAuth()
```

`useAuth` throws if called outside `AuthProvider` — it is always available in screens since `AuthProvider` wraps everything in `_layout.tsx`.

## Map screen specifics (`explore.tsx`)

The map is a Leaflet HTML page rendered in a `react-native-webview`. To update the map after mount, use `webViewRef.current.injectJavaScript(...)` rather than re-rendering. The WebView re-renders with a new `key` only when friend locations change (to show updated pins).

Location is pushed to the backend inside `Location.watchPositionAsync` — the backend rejects pushes if `share_location` is false in the user's settings.
