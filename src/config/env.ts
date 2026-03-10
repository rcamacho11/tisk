export const API_URL = process.env.EXPO_PUBLIC_API_URL

if (!API_URL) {
  throw new Error('Missing EXPO_PUBLIC_API_URL environment variable')
}
