import AsyncStorage from '@react-native-async-storage/async-storage'
import { ApiError, ApiResponse } from '../types/api'

const API_URL = process.env.EXPO_PUBLIC_API_URL as string
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY as string

class ApiClient {
  private baseUrl: string
  private requestId = 0

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    console.log('[ApiClient] Initialized with baseUrl:', baseUrl)
  }

  private getRequestId(): string {
    return `[REQ-${++this.requestId}]`
  }

  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('supabase_access_token')
    } catch (error) {
      console.error('[ApiClient] Token read error', error)
      return null
    }
  }

  async buildHeaders(
    options: { authenticated: boolean } = { authenticated: true },
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
    }

    if (options.authenticated) {
      const token = await this.getAuthToken()
      if (token) {
        headers.Authorization = `Bearer ${token}`
      } else {
        // If an authenticated request is made without a token,
        // do not add the Authorization header.
        // The edge function will reject this with a 401, which is correct.
        console.warn('[ApiClient] Authenticated request made without a token.')
      }
    } else {
      // For public routes (signup/login), Supabase gateway still requires
      // an Authorization header — use the anon/publishable key as the Bearer token.
      headers.Authorization = `Bearer ${SUPABASE_KEY}`
    }

    console.log('[ApiClient] Headers:', headers)
    return headers
  }

  handleError(error: unknown): ApiError {
    if (error instanceof Error) {
      return { message: error.message }
    }

    return { message: 'Unknown error occurred' }
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    options?: { authenticated: boolean },
  ): Promise<ApiResponse<T>> {
    const requestId = this.getRequestId()

    try {
      const url = `${this.baseUrl}${endpoint}`
      const headers = await this.buildHeaders(options)

      console.log(`${requestId} POST →`, url)
      console.log(`${requestId} Body:`, body)

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      const text = await response.text()

      console.log(`${requestId} Status:`, response.status)
      console.log(`${requestId} Response:`, text)

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('supabase_access_token')
        }

        throw new Error(text)
      }

      const data = JSON.parse(text)

      return { data, error: null }
    } catch (error) {
      console.error(`${requestId} POST error`, error)

      return {
        data: null,
        error: this.handleError(error),
      }
    }
  }

  async get<T>(
    endpoint: string,
    options?: { authenticated: boolean },
  ): Promise<ApiResponse<T>> {
    const requestId = this.getRequestId()

    try {
      const url = `${this.baseUrl}${endpoint}`
      const headers = await this.buildHeaders(options)

      console.log(`${requestId} GET →`, url)

      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      const data = await response.json()

      return { data, error: null }
    } catch (error) {
      console.error(`${requestId} GET error`, error)

      return {
        data: null,
        error: this.handleError(error),
      }
    }
  }

  async put<T>(
    endpoint: string,
    body: unknown,
    options?: { authenticated: boolean },
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.buildHeaders(options)

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      })

      const data = await response.json()

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error),
      }
    }
  }

  async delete<T>(
    endpoint: string,
    options?: { authenticated: boolean },
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.buildHeaders(options)

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
      })


      const data = await response.json()

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error),
      }
    }
  }
}

export const api = new ApiClient(API_URL)