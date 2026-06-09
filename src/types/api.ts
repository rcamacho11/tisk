export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Session {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  user: User
}

export interface AuthResponse {
  session: Session | null
  user: User | null
  error: string | null
}

export interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  category: string
  dueDate: string | null
  completed: boolean
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  bio: string | null
  updated_at: string
}

export interface Friend {
  friendship_id: string
  user_id: string
  username: string
  name: string | null
  avatar_url: string | null
}

export interface FriendRequestItem {
  id: string
  created_at: string
  requester: {
    user_id: string
    username: string
    name: string | null
    avatar_url: string | null
  }
}

export interface Settings {
  id: string
  user_id: string
  notifications_enabled: boolean
  dark_mode: boolean
  private_profile: boolean
  show_online_status: boolean
  updated_at: string
}

export interface Location {
  latitude: number
  longitude: number
  address: string
  accuracy: number
  timestamp: string
}

export interface FriendLocation {
  user_id: string
  latitude: number
  longitude: number
  address: string | null
  accuracy: number | null
  updated_at: string
  profile: {
    username: string
    name: string | null
    avatar_url: string | null
  }
}

export interface ApiError {
  message: string
  status?: number
}

export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
}

export interface CreateTaskInput {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  category: string
  dueDate?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  category?: string
  dueDate?: string | null
  completed?: boolean
}

export interface CreateSubtaskInput {
  title: string
}

export interface UpdateProfileInput {
  username?: string
  name?: string
  avatar_url?: string | null
  bio?: string | null
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string | null
  created_at: string
}

export interface CreateCategoryInput {
  name: string
  color?: string
}

export interface UpdateSettingsInput {
  notifications_enabled?: boolean
  dark_mode?: boolean
  private_profile?: boolean
  show_online_status?: boolean
}

export interface SignUpInput {
  email: string
  password: string
  name: string
}

export interface SignInInput {
  email: string
  password: string
}

export interface FriendRequest {
  username: string
}
