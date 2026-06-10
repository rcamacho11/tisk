import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'

import { Task } from '../types/api'
import { locationService } from './locationService'
import { notificationService } from './notificationService'

export const LOCATION_TASK_NAME = 'tisk-location-check'
const COOLDOWN_KEY = 'notif_cooldown_'
const COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes between notifications per task

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (deg: number) => deg * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function isOnCooldown(taskId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(COOLDOWN_KEY + taskId)
  if (!raw) return false
  return Date.now() - parseInt(raw, 10) < COOLDOWN_MS
}

async function setCooldown(taskId: string) {
  await AsyncStorage.setItem(COOLDOWN_KEY + taskId, Date.now().toString())
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return
  if (!data) return

  const { locations } = data as { locations: Location.LocationObject[] }
  if (!locations || locations.length === 0) return

  const { latitude, longitude, accuracy } = locations[0].coords

  await locationService.sendLocation({
    latitude,
    longitude,
    address: '',
    accuracy: accuracy ?? 0,
    timestamp: new Date().toISOString(),
  })

  const raw = await AsyncStorage.getItem('tisk_tasks_cache')
  if (!raw) return

  let tasks: Task[]
  try {
    tasks = JSON.parse(raw)
  } catch {
    return
  }

  for (const task of tasks) {
    if (task.completed) continue
    if (task.latitude == null || task.longitude == null) continue

    const distance = haversineDistance(latitude, longitude, task.latitude, task.longitude)
    if (distance <= 50) {
      const onCooldown = await isOnCooldown(task.id)
      if (!onCooldown) {
        await notificationService.sendLocationReminder(task)
        await setCooldown(task.id)
      }
    }
  }
})

class LocationTaskService {
  async start() {
    if (Platform.OS === 'web') return

    const { status: foreground } = await Location.requestForegroundPermissionsAsync()
    if (foreground !== 'granted') return

    // requestBackgroundPermissionsAsync throws in Expo Go instead of returning 'denied'
    let background = 'denied'
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync()
      background = status
    } catch {
      return
    }
    if (background !== 'granted') return

    const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)
    if (isRunning) return

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60_000,
      distanceInterval: 30,
      deferredUpdatesInterval: 60_000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Tisk',
        notificationBody: 'Watching for nearby tasks',
        notificationColor: '#4CAF50',
      },
    })
  }

  async stop() {
    const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  }

  async cacheTasks(tasks: Task[]) {
    const incomplete = tasks.filter(t => !t.completed && t.latitude != null && t.longitude != null)
    await AsyncStorage.setItem('tisk_tasks_cache', JSON.stringify(incomplete))
  }
}

export const locationTaskService = new LocationTaskService()
