import { api } from '../api/client'
import { ApiResponse, Friend, FriendRequest } from '../types/api'

class FriendService {
  async getFriends(): Promise<ApiResponse<Friend[]>> {
    return api.get<Friend[]>('/friends')
  }

  async addFriend(input: FriendRequest): Promise<ApiResponse<Friend>> {
    return api.post<Friend>('/friends', input)
  }

  async removeFriend(friendId: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/friends/${friendId}`)
  }
}

export const friendService = new FriendService()
