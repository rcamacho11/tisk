import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'
import { Session, User } from '../types/api'

interface AuthContextValue {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  signup: (email: string, password: string, name: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<boolean>
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
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authService.signup({ email, password, name })
      if (response.error) { setError(response.error); return false }
      setSession(response.session)
      setUser(response.user)
      if (response.session?.access_token) {
        await AsyncStorage.setItem('supabase_access_token', response.session.access_token)
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authService.login({ email, password })
      if (response.error) { setError(response.error); return false }
      setSession(response.session)
      setUser(response.user)
      if (response.session?.access_token) {
        await AsyncStorage.setItem('supabase_access_token', response.session.access_token)
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      return false
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
