# Roadmap & Known Gaps

## What's Complete

- Auth (signup, login, logout, session persistence)
- Task CRUD: title, description, priority, category, due date, completed toggle
- Subtasks: add, toggle, delete
- Task filtering (all/active/completed) and sorting (date/priority/category)
- Custom categories with optional color
- Friend request system (send by username, accept/reject, unfriend)
- Real-time friend location sharing (Supabase Realtime + Leaflet map)
- Location sharing opt-in per user (`share_location` setting)
- Profile editing (username, name, bio)
- Settings persistence (dark mode, notifications, private profile, share location)

## Known Gaps & Incomplete Features

### Dark Mode is not dynamic
The settings screen has a Dark Mode toggle that writes to `user_settings.dark_mode`, but the theme is read from `useColorScheme()` which returns the **OS setting**, not the stored preference. The stored value is never read back to override the system theme. Fix: read `settings.dark_mode` from the API on startup and pass it into the theme provider.

### Notifications toggle is a no-op
`notifications_enabled` is stored in settings but no notification infrastructure (Expo Notifications, push tokens, triggers) is implemented. The switch is wired to save but nothing acts on the value.

### AI Photo Verification (planned, not started)
The original vision includes users uploading a completion photo and an AI model verifying it matches the task description. No code exists for this yet. Would require: image upload (Supabase Storage or similar), an edge function calling a vision model, and a `verified` field on tasks.

### Profile Avatar Upload
The `profiles.avatar_url` column exists and is returned in friend lists and profile data, but there is no UI to upload or change an avatar. The `Ionicons person-circle` placeholder is always shown.

### Due Date Input
Due dates are entered as a plain text input requiring `YYYY-MM-DD` format. A `DateTimePicker` component (e.g., `@react-native-community/datetimepicker`) would improve UX.

### `Task` Type / `category_id` vs `category` Mismatch
The `Task` interface in `src/types/api.ts` has `category: string` but the DB column is `category_id` (a UUID). Screens work around this with `as any` casts. Fix: rename the field in the interface to `category_id: string | null` and remove the casts.

### `index-tasks.tsx` is dead code
`app/(tabs)/index-tasks.tsx` is an older version of the tasks screen. It is not routed anywhere. It should be deleted.

### `modal.tsx` is a placeholder
`app/modal.tsx` is an empty Expo Router placeholder. Either wire it up to something or delete it.

### No error boundaries
If a screen-level fetch fails entirely, the user sees nothing or a blank state. Adding React error boundaries or more explicit empty/error states would improve resilience.

## Next Steps to Pick Up

1. Fix the `Task` type mismatch (`category` → `category_id`) — low risk, improves type safety.
2. Wire dark mode: read `settings.dark_mode` from the API and apply it as the theme.
3. Add a date picker component to the task creation/edit modal.
4. Implement avatar upload using Supabase Storage.
5. Implement push notifications using Expo Notifications.
6. Design and build the AI photo verification flow.
