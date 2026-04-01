import { api } from '../api/client'
import { ApiResponse, Friend, FriendRequest, FriendRequestItem } from '../types/api'

class FriendService {
  async getFriends(): Promise<ApiResponse<Friend[]>> {
    return api.get<Friend[]>('/friends')
  }

  async getFriendRequests(): Promise<ApiResponse<FriendRequestItem[]>> {
    return api.get<FriendRequestItem[]>('/friends/requests')
  }

  async addFriend(input: FriendRequest): Promise<ApiResponse<Friend>> {
    return api.post<Friend>('/friends', input)
  }

  async respondToRequest(id: string, status: 'accepted' | 'rejected'): Promise<ApiResponse<void>> {
    return api.put<void>(`/friends/${id}`, { status })
  }

  async removeFriend(friendshipId: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/friends/${friendshipId}`)
  }
}

export const friendService = new FriendService()
