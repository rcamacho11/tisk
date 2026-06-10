import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'
import { Session, User } from '../types/api'
import { supabase } from '../../utils/supabase'

interface AuthResult {
  success: boolean
  error?: string
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  signup: (email: string, password: string, name: string) => Promise<AuthResult>
  login: (email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userSession = await authService.getSession()
        setSession(userSession)
        if (userSession) {
          setUser(userSession.user)
          try {
            await AsyncStorage.setItem('supabase_access_token', userSession.access_token)
          } catch {}
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check auth')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()

    // Keep supabase_access_token in sync when the SDK auto-refreshes the token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        try {
          await AsyncStorage.setItem('supabase_access_token', session.access_token)
        } catch {}
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string): Promise<AuthResult> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authService.signup({ email, password, name })
      if (response.error) {
        setError(response.error)
        return { success: false, error: response.error }
      }
      setSession(response.session)
      setUser(response.user)
      if (response.session?.access_token) {
        await AsyncStorage.setItem('supabase_access_token', response.session.access_token)
      }
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authService.login({ email, password })
      if (response.error) {
        setError(response.error)
        return { success: false, error: response.error }
      }
      setSession(response.session)
      setUser(response.user)
      if (response.session?.access_token) {
        await AsyncStorage.setItem('supabase_access_token', response.session.access_token)
      }
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await authService.logout()
      setUser(null)
      setSession(null)
      setError(null)
      await AsyncStorage.removeItem('supabase_access_token')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, isLoading, error, isAuthenticated: !!session, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
