import { api } from '../api/client'
import { ApiResponse, Location } from '../types/api'

class LocationService {
  async sendLocation(input: Location): Promise<ApiResponse<void>> {
    return api.post<void>('/location', {
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      accuracy: input.accuracy,
    })
  }

  async getCurrentLocation(): Promise<Location | null> {
    // This will be implemented with expo-location
    // For now, returning null as a placeholder
    return null
  }
}

export const locationService = new LocationService()
