import { useCallback, useEffect, useState } from 'react'
import { ApiError, ApiResponse } from '../types/api'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
}

export function useApi<T>(
  callback: () => Promise<ApiResponse<T>>,
  dependencies: unknown[] = []
): UseApiState<T> & {
  refetch: () => Promise<void>
} {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchData = useCallback(async () => {
    setState({ data: null, loading: true, error: null })
    try {
      const response = await callback()
      setState({
        data: response.data,
        loading: false,
        error: response.error,
      })
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: {
          message: err instanceof Error ? err.message : 'An error occurred',
        },
      })
    }
  }, [callback])

  useEffect(() => {
    fetchData()
  }, dependencies)

  return {
    ...state,
    refetch: fetchData,
  }
}

export function useMutation<T, InputT = void>(
  callback: (input: InputT) => Promise<ApiResponse<T>>
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(
    async (input: InputT) => {
      setState({ data: null, loading: true, error: null })
      try {
        const response = await callback(input)
        setState({
          data: response.data,
          loading: false,
          error: response.error,
        })
        return response
      } catch (err) {
        const error: ApiError = {
          message: err instanceof Error ? err.message : 'An error occurred',
        }
        setState({
          data: null,
          loading: false,
          error,
        })
        return { data: null, error }
      }
    },
    [callback]
  )

  return {
    ...state,
    mutate,
  }
}
