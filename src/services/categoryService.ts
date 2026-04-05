import { api } from '../api/client'
import { ApiResponse, Category, CreateCategoryInput } from '../types/api'

class CategoryService {
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return api.get<Category[]>('/categories')
  }

  async createCategory(input: CreateCategoryInput): Promise<ApiResponse<Category>> {
    return api.post<Category>('/categories', input)
  }

  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/categories/${id}`)
  }
}

export const categoryService = new CategoryService()
