import { supabase } from '../../utils/supabase'
import { AuthResponse, Session, SignInInput, SignUpInput, User } from '../types/api'

class AuthService {
  // Transform Supabase user to our User type
  private transformSupabaseUserToUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || '',
      created_at: supabaseUser.created_at || new Date().toISOString(),
    }
  }

  // Transform Supabase session to our Session type
  private transformSupabaseSessionToSession(supabaseSession: any): Session | null {
    if (!supabaseSession) return null

    const user = this.transformSupabaseUserToUser(supabaseSession.user)
    return {
      access_token: supabaseSession.access_token || '',
      token_type: supabaseSession.token_type || 'Bearer',
      expires_in: supabaseSession.expires_in || 0,
      refresh_token: supabaseSession.refresh_token || '',
      user,
    } as Session
  }

  async signup(input: SignUpInput): Promise<AuthResponse> {
    console.log('[AuthService] ========== SIGNUP START ==========')
    console.log('[AuthService] Starting signup with email:', input.email)
    console.log('[AuthService] Signup input fields:', { email: input.email, password: '***', name: input.name })

    try {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            name: input.name,
          },
        },
      })

      if (error) {
        console.error('[AuthService] ❌ Signup auth error:', error.message)
        return { session: null, user: null, error: error.message }
      }

      // Transform Supabase response to our types
      const transformedUser = data.user ? this.transformSupabaseUserToUser(data.user) : null
      const transformedSession = data.session ? this.transformSupabaseSessionToSession(data.session) : null

      console.log('[AuthService] ✅ Signup successful for:', input.email)
      console.log('[AuthService] ========== SIGNUP END ==========')
      return {
        session: transformedSession,
        user: transformedUser,
        error: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      console.error('[AuthService] ❌ Signup error:', message)
      return { session: null, user: null, error: message }
    }
  }

  async login(input: SignInInput): Promise<AuthResponse> {
    console.log('[AuthService] Starting login with email:', input.email)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })

      if (error) {
        console.error('[AuthService] Login error:', error.message)
        return { session: null, user: null, error: error.message }
      }

      // Transform Supabase response to our types
      const transformedUser = data.user ? this.transformSupabaseUserToUser(data.user) : null
      const transformedSession = data.session ? this.transformSupabaseSessionToSession(data.session) : null

      console.log('[AuthService] Login successful for:', input.email)
      return {
        session: transformedSession,
        user: transformedUser,
        error: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      console.error('[AuthService] Login error:', message)
      return { session: null, user: null, error: message }
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('[AuthService] Logging out...')
      await supabase.auth.signOut()
      console.log('[AuthService] Logout successful')
    } catch (error) {
      console.error('[AuthService] Logout error:', error)
    }
  }

  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.log('[AuthService] Get session error:', error.message)
        return null
      }

      if (!data.session) {
        console.log('[AuthService] No session found')
        return null
      }

      // Transform Supabase session to our Session type
      const transformedSession = this.transformSupabaseSessionToSession(data.session)
      console.log('[AuthService] Session found')
      return transformedSession
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
