import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../api/client'
import { AuthResponse, Session, SignInInput, SignUpInput } from '../types/api'

class AuthService {
  async signup(input: SignUpInput): Promise<AuthResponse> {
    console.log('[AuthService] ========== SIGNUP START ==========')
    console.log('[AuthService] Starting signup with email:', input.email)
    console.log('[AuthService] Signup input fields:', { email: input.email, password: '***', name: input.name })
    
    const signupEndpoint = '/auth?action=signup'
    const signupPayload = {
      email: input.email,
      password: input.password,
      name: input.name,
    }
    
    console.log('[AuthService] ✅ Endpoint:', signupEndpoint)
    console.log('[AuthService] ✅ Payload fields:', { email: signupPayload.email, password: '***', name: signupPayload.name })
    console.log('[AuthService] Making API call to:', signupEndpoint)
    
    const { data, error } = await api.post<Session>(
      signupEndpoint,
      signupPayload,
      { authenticated: false },
    )

    if (error) {
      console.error('[AuthService] ❌ Signup API error:', error)
      console.error('[AuthService] Error message:', error?.message)
      return { session: null, user: null, error: error?.message || 'Signup failed' }
    }

    if (!data) {
      console.error('[AuthService] ❌ Signup returned no data')
      return { session: null, user: null, error: 'No data returned from signup' }
    }

    try {
      console.log('[AuthService] ✅ API response received, storing token')
      await AsyncStorage.setItem('supabase_access_token', data.access_token)
      console.log('[AuthService] ✅ Token stored successfully')
    } catch (storageError) {
      console.error('[AuthService] ❌ Failed to store token:', storageError)
      return { session: null, user: null, error: 'Failed to store session token' }
    }

    console.log('[AuthService] ✅ Signup successful for:', input.email)
    console.log('[AuthService] ========== SIGNUP END ==========')
    return {
      session: data,
      user: data.user,
      error: null,
    }
  }

  async login(input: SignInInput): Promise<AuthResponse> {
    console.log('[AuthService] Starting login with email:', input.email)
    
    const loginEndpoint = '/auth?action=login'
    const loginPayload = {
      email: input.email,
      password: input.password,
    }
    
    console.log('[AuthService] Calling login endpoint:', loginEndpoint)
    console.log('[AuthService] Login payload:', loginPayload)
    
    const { data, error } = await api.post<Session>(loginEndpoint, loginPayload, {
      authenticated: false,
    })

    if (error) {
      console.error('[AuthService] Login error:', error)
      return { session: null, user: null, error: error?.message || 'Login failed' }
    }

    if (!data) {
      console.error('[AuthService] Login returned no data')
      return { session: null, user: null, error: 'No data returned from login' }
    }

    try {
      // Store access token
      await AsyncStorage.setItem('supabase_access_token', data.access_token)
      console.log('[AuthService] Token stored successfully')
    } catch (storageError) {
      console.error('[AuthService] Failed to store token:', storageError)
      return { session: null, user: null, error: 'Failed to store session token' }
    }

    console.log('[AuthService] Login successful for:', input.email)
    return {
      session: data,
      user: data.user,
      error: null,
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('[AuthService] Logging out...')
      await AsyncStorage.removeItem('supabase_access_token')
      console.log('[AuthService] Logout successful')
    } catch (error) {
      console.error('[AuthService] Logout error:', error)
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      const token = await AsyncStorage.getItem('supabase_access_token')
      if (!token) {
        console.log('[AuthService] No session token found')
        return null
      }

      console.log('[AuthService] Session token found')
      // In a real app, you'd validate the token with the backend
      // For now, we'll just check if it exists
      return { access_token: token } as Session
    } catch (error) {
      console.error('[AuthService] Get session error:', error)
      return null
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession()
    return !!session
  }
}

export const authService = new AuthService()
