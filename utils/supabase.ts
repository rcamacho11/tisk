import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

// Use AsyncStorage on native platforms, fall back to a simple in-memory store on web
const getAuthStorage = () => {
  if (typeof window === 'undefined') {
    // Server or native environment
    return AsyncStorage
  }
  // Web environment: use localStorage if available, otherwise in-memory
  return {
    getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key: string, value: string) => {
      localStorage.setItem(key, value)
      return Promise.resolve()
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key)
      return Promise.resolve()
    },
  }
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: getAuthStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
)
