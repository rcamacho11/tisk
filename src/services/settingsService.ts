import { api } from '../api/client'
import { ApiResponse, Settings, UpdateSettingsInput } from '../types/api'

class SettingsService {
  async getSettings(): Promise<ApiResponse<Settings>> {
    return api.get<Settings>('/settings')
  }

  async updateSettings(input: UpdateSettingsInput): Promise<ApiResponse<Settings>> {
    return api.put<Settings>('/settings', input)
  }
}

export const settingsService = new SettingsService()
