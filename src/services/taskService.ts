import { api } from '../api/client'
import { ApiResponse, CreateTaskInput, Task, UpdateTaskInput } from '../types/api'

class TaskService {
  async getTasks(): Promise<ApiResponse<Task[]>> {
    return api.get<Task[]>('/tasks')
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
