import { api } from '../api/client'
import { ApiResponse, CreateSubtaskInput, Subtask } from '../types/api'

class SubtaskService {
  async createSubtask(
    taskId: string,
    input: CreateSubtaskInput
  ): Promise<ApiResponse<Subtask>> {
    return api.post<Subtask>(`/tasks/${taskId}/subtasks`, input)
  }

  async updateSubtask(
    id: string,
    input: Partial<Omit<Subtask, 'id' | 'taskId' | 'created_at' | 'updated_at'>>
  ): Promise<ApiResponse<Subtask>> {
    return api.put<Subtask>(`/subtasks/${id}`, input)
  }

  async deleteSubtask(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/subtasks/${id}`)
  }

  async completeSubtask(id: string): Promise<ApiResponse<Subtask>> {
    return this.updateSubtask(id, { completed: true })
  }

  async uncompleteSubtask(id: string): Promise<ApiResponse<Subtask>> {
    return this.updateSubtask(id, { completed: false })
  }
}

export const subtaskService = new SubtaskService()
