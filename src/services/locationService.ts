import { api } from '../api/client'
import { ApiResponse, FriendLocation, Location } from '../types/api'

class LocationService {
  async sendLocation(input: Location): Promise<ApiResponse<void>> {
    return api.post<void>('/location', {
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      accuracy: input.accuracy,
    })
  }

  async getFriendsLocations(): Promise<ApiResponse<FriendLocation[]>> {
    return api.get<FriendLocation[]>('/location/friends')
  }
}

export const locationService = new LocationService()
