import { useCallback, useEffect, useState } from 'react'
import { authService } from '../services/authService'
import { Session, User } from '../types/api'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[useAuth] Checking authentication on mount')
        const userSession = await authService.getSession()
        setSession(userSession)
        if (userSession) {
          console.log('[useAuth] User session found')
          setUser(userSession.user)
        } else {
          console.log('[useAuth] No user session found')
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to check auth'
        console.error('[useAuth] Auth check error:', errMsg)
        setError(errMsg)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      console.log('[useAuth] signup() called with email:', email)
      setIsLoading(true)
      setError(null)
      try {
        const response = await authService.signup({ email, password, name })
        if (response.error) {
          console.error('[useAuth] Signup returned error:', response.error)
          setError(response.error)
          return false
        }
        setSession(response.session)
        setUser(response.user)
        console.log('[useAuth] Signup successful, user:', response.user?.email)
        return true
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Signup failed'
        console.error('[useAuth] Signup exception caught:', errorMsg)
        setError(errorMsg)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const login = useCallback(async (email: string, password: string) => {
    console.log('[useAuth] login() called with email:', email)
    setIsLoading(true)
    setError(null)
    try {
      const response = await authService.login({ email, password })
      if (response.error) {
        console.error('[useAuth] Login returned error:', response.error)
        setError(response.error)
        return false
      }
      setSession(response.session)
      setUser(response.user)
      console.log('[useAuth] Login successful, user:', response.user?.email)
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed'
      console.error('[useAuth] Login exception caught:', errorMsg)
      setError(errorMsg)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    console.log('[useAuth] logout() called')
    setIsLoading(true)
    try {
      await authService.logout()
      setUser(null)
      setSession(null)
      setError(null)
      console.log('[useAuth] Logout successful')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Logout failed'
      console.error('[useAuth] Logout exception:', errorMsg)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    user,
    session,
    isLoading,
    error,
    isAuthenticated: !!session,
    signup,
    login,
    logout,
  }
}
