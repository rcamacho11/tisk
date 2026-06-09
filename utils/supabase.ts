import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const getAuthStorage = () => {
  // React Native (iOS/Android) — navigator.product is 'ReactNative' in the JS engine
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return AsyncStorage
  }
  // Browser
  if (typeof window !== 'undefined') {
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
  // Node.js / SSR (Metro pre-render, expo-router static generation) — no-op
  return {
    getItem: (_key: string) => Promise.resolve(null),
    setItem: (_key: string, _value: string) => Promise.resolve(),
    removeItem: (_key: string) => Promise.resolve(),
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
