import { useCallback, useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'

import { locationTaskService } from '../services/locationTaskService'
import { notificationService } from '../services/notificationService'
import { taskService } from '../services/taskService'

export function useNotifications(isAuthenticated: boolean) {
  const initialized = useRef(false)

  const fetchAndSchedule = useCallback(async () => {
    const { data: tasks } = await taskService.getTasks()
    if (!tasks || tasks.length === 0) return
    await notificationService.scheduleTaskNotifications(tasks)
    await locationTaskService.cacheTasks(tasks)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    if (initialized.current) return
    initialized.current = true

    ;(async () => {
      const granted = await notificationService.requestPermissions()
      if (!granted) return
      await notificationService.setupChannel()
      await locationTaskService.start()
      await fetchAndSchedule()
    })()

    return () => {
      initialized.current = false
    }
  }, [isAuthenticated, fetchAndSchedule])

  useEffect(() => {
    if (!isAuthenticated) return

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        fetchAndSchedule()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppState)
    return () => subscription.remove()
  }, [isAuthenticated, fetchAndSchedule])
}
