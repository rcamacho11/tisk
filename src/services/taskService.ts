import { api } from '../api/client'
import { ApiResponse, CreateTaskInput, Task, UpdateTaskInput } from '../types/api'

interface TasksResponse {
  success: boolean
  tasks?: Task[]
  error?: string
}

class TaskService {
  async getTasks(): Promise<ApiResponse<Task[]>> {
    try {
      const response = await api.get<TasksResponse>('/tasks')
      
      // If there's an error, return it
      if (response.error) {
        return { data: null, error: response.error }
      }
      
      // Extract the tasks array from the response
      // The edge function returns { success: true, tasks: [...] }
      const tasks = response.data?.tasks || []
      
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

  async completeTask(id: string): Promise<ApiResponse<Task>> {
    return this.updateTask(id, { completed: true })
  }

  async uncompleteTask(id: string): Promise<ApiResponse<Task>> {
    return this.updateTask(id, { completed: false })
  }
}

export const taskService = new TaskService()
