import { api } from '../api/client'
import { ApiResponse, Profile, UpdateProfileInput } from '../types/api'

class ProfileService {
  async getProfile(): Promise<ApiResponse<Profile>> {
    return api.get<Profile>('/profile')
  }

  async updateProfile(input: UpdateProfileInput): Promise<ApiResponse<Profile>> {
    return api.put<Profile>('/profile', input)
  }

  async getProfileById(userId: string): Promise<ApiResponse<Profile>> {
    return api.get<Profile>(`/profile/${userId}`)
  }
}

export const profileService = new ProfileService()
