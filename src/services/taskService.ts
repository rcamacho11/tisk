import { api } from '../api/client'
import { ApiResponse, CreateTaskInput, FriendTask, Task, UpdateTaskInput } from '../types/api'

class TaskService {
  async getTasks(): Promise<ApiResponse<Task[]>> {
    try {
      const response = await api.get<Task[]>('/tasks')

      if (response.error) {
        return { data: null, error: response.error }
      }

      const tasks = Array.isArray(response.data) ? response.data : []

      return { data: tasks, error: null }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch tasks',
        },
      }
    }
  }

  async getFriendsTasks(): Promise<ApiResponse<FriendTask[]>> {
    try {
      const response = await api.get<FriendTask[]>('/tasks/friends')

      if (response.error) {
        return { data: null, error: response.error }
      }

      const tasks = Array.isArray(response.data) ? response.data : []

      return { data: tasks, error: null }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch friend tasks',
        },
      }
    }
  }

  async getTask(id: string): Promise<ApiResponse<Task>> {
    return api.get<Task>(`/tasks/${id}`)
  }

  async createTask(input: CreateTaskInput): Promise<ApiResponse<Task>> {
    return api.post<Task>('/tasks', input)
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<ApiResponse<Task>> {
    return api.put<Task>(`/tasks/${id}`, input)
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/tasks/${id}`)
  }

  async completeTask(id: string, userLatitude: number, userLongitude: number): Promise<ApiResponse<Task>> {
    return this.updateTask(id, { completed: true, user_latitude: userLatitude, user_longitude: userLongitude })
  }

  async uncompleteTask(id: string): Promise<ApiResponse<Task>> {
    return this.updateTask(id, { completed: false })
  }
}

export const taskService = new TaskService()
