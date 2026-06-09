# Data Models & TypeScript Types

All shared types are defined in **`src/types/api.ts`**. Import from there — do not redefine these shapes in components.

## Core Types

### User & Auth

```typescript
interface User {
  id: string           // UUID from Supabase Auth
  email: string
  name?: string
  username?: string
}

interface Session {
  access_token: string
  token_type: string
  expires_in: number
  expires_at?: number
  refresh_token: string
  user: User
}

interface AuthResponse {
  session: Session
  user: User
}
```

### Task

```typescript
type Priority = 'low' | 'medium' | 'high'
type Category = 'Work' | 'Personal' | 'Shopping' | 'Health' | 'Finance'

interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  priority: Priority
  category: Category
  due_date?: string      // ISO 8601 string
  completed: boolean
  completed_at?: string  // ISO 8601 string
  created_at: string
  updated_at?: string
  subtasks?: Subtask[]
}

interface CreateTaskInput {
  title: string
  description?: string
  priority: Priority
  category: Category
  due_date?: string
}

interface UpdateTaskInput {
  title?: string
  description?: string
  priority?: Priority
  category?: Category
  due_date?: string
  completed?: boolean
}
```

### Subtask

```typescript
interface Subtask {
  id: string
  task_id: string
  user_id: string
  title: string
  completed: boolean
  created_at: string
}
```

### Profile

```typescript
interface Profile {
  id: string
  name: string
  username?: string
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at?: string
}

interface UpdateProfileInput {
  name?: string
  username?: string
  avatar_url?: string
  bio?: string
}
```

### Friend

```typescript
interface Friend {
  id: string          // friendship row id
  user_id: string
  friend_id: string
  status: string      // 'accepted' | 'pending'
  created_at: string
  friend?: Profile    // joined profile of the friend
}
```

### Settings

```typescript
interface Settings {
  user_id: string
  notifications_enabled: boolean
  dark_mode: boolean
  privacy_mode: boolean
  updated_at?: string
}

interface UpdateSettingsInput {
  notifications_enabled?: boolean
  dark_mode?: boolean
  privacy_mode?: boolean
}
```

### Location

```typescript
interface Location {
  latitude: number
  longitude: number
  accuracy?: number
  address?: string
}
```

## API Response Wrappers

```typescript
interface ApiError {
  message: string
  code?: string
  details?: unknown
}

interface ApiResponse<T> {
  data: T
  error?: ApiError
}
```

Services return the inner `T` directly (unwrapped). The `ApiClient` throws on HTTP errors, so callers should `try/catch` or use `useMutation` which handles errors internally.

## Adding a New Type

1. Add the interface/type to `src/types/api.ts`.
2. Add the corresponding input type if it's a mutable resource.
3. Update the service in `src/services/` to use the new type.
4. Update the edge function (`supabase/functions/rapid-task/`) to handle the new shape.

## Type Safety Notes

- **Strict mode is on** — `tsc --noEmit` must pass before committing.
- `due_date`, `completed_at`, `updated_at` are `string | undefined` (ISO 8601) because JSON has no native Date type. Parse them with `new Date(value)` before display or comparison.
- `category` and `priority` are string union types, not enums — use the literal strings in comparisons and form values.
- The `user_id` on all resources matches `session.user.id` from `useAuth()`.
