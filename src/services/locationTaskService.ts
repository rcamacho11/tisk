import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'

import { Task } from '../types/api'
import { locationService } from './locationService'
import { notificationService } from './notificationService'

export const LOCATION_TASK_NAME = 'tisk-location-check'
export const GEOFENCE_TASK_NAME = 'tisk-geofence'
const COOLDOWN_KEY = 'notif_cooldown_'
const COOLDOWN_MS = 30 * 60 * 1000
const LAST_BG_SEND_KEY = 'last_bg_location_send'
const BG_SEND_INTERVAL = 5 * 60 * 1000
const MAX_GEOFENCE_REGIONS = 20

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

// OS-level geofence task — fires when user enters a task's radius.
// Far more battery-efficient than GPS polling since the OS monitors regions
// using WiFi/cell/GPS hybrid without keeping GPS hardware active.
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error || !data) return
  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType
    region: Location.LocationRegion
  }

  if (eventType !== Location.GeofencingEventType.Enter) return

  const taskId = region.identifier
  if (!taskId) return

  const onCooldown = await isOnCooldown(taskId)
  if (onCooldown) return

  const raw = await AsyncStorage.getItem('tisk_tasks_cache')
  if (!raw) return

  try {
    const tasks: Task[] = JSON.parse(raw)
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      await notificationService.sendLocationReminder(task)
      await setCooldown(taskId)
    }
  } catch {}
})

// Background location task — sends periodic location updates and provides
// fallback proximity detection when geofencing is unavailable.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data) return

  const { locations } = data as { locations: Location.LocationObject[] }
  if (!locations || locations.length === 0) return

  const { latitude, longitude, accuracy } = locations[0].coords

  const lastSendRaw = await AsyncStorage.getItem(LAST_BG_SEND_KEY)
  const lastSend = lastSendRaw ? parseInt(lastSendRaw, 10) : 0
  const now = Date.now()

  if (now - lastSend >= BG_SEND_INTERVAL) {
    await locationService.sendLocation({
      latitude,
      longitude,
      address: '',
      accuracy: accuracy ?? 0,
      timestamp: new Date().toISOString(),
    })
    await AsyncStorage.setItem(LAST_BG_SEND_KEY, now.toString())
  }

  // Fallback proximity check for devices where geofencing isn't active
  const geofenceActive = await AsyncStorage.getItem('tisk_geofence_active')
  if (geofenceActive === 'true') return

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

    const { status: background } = await Location.requestBackgroundPermissionsAsync()
    if (background !== 'granted') return

    // Clean up legacy duplicate task from explore.tsx
    try {
      const legacyRunning = await TaskManager.isTaskRegisteredAsync('background-location-task')
      if (legacyRunning) {
        await Location.stopLocationUpdatesAsync('background-location-task')
      }
    } catch {}

    const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)
    if (isRunning) return

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Low,
      timeInterval: 5 * 60_000,
      distanceInterval: 100,
      deferredUpdatesInterval: 5 * 60_000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Tisk',
        notificationBody: 'Watching for nearby tasks',
        notificationColor: '#4CAF50',
      },
      activityType: Location.ActivityType.Other,
      pausesUpdatesAutomatically: true,
    })
  }

  async stop() {
    try {
      const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      }
    } catch {}
    await this.stopGeofencing()
  }

  async cacheTasks(tasks: Task[]) {
    const incomplete = tasks.filter(t => !t.completed && t.latitude != null && t.longitude != null)
    await AsyncStorage.setItem('tisk_tasks_cache', JSON.stringify(incomplete))
    await this.updateGeofences(incomplete)
  }

  private async updateGeofences(tasks: Task[]) {
    if (Platform.OS === 'web') return

    try {
      const { status } = await Location.getBackgroundPermissionsAsync()
      if (status !== 'granted') {
        await AsyncStorage.setItem('tisk_geofence_active', 'false')
        return
      }

      await this.stopGeofencing()

      const geoTasks = tasks
        .filter(t => t.latitude != null && t.longitude != null)
        .slice(0, MAX_GEOFENCE_REGIONS)

      if (geoTasks.length === 0) {
        await AsyncStorage.setItem('tisk_geofence_active', 'false')
        return
      }

      await Location.startGeofencingAsync(
        GEOFENCE_TASK_NAME,
        geoTasks.map(t => ({
          identifier: t.id,
          latitude: t.latitude!,
          longitude: t.longitude!,
          radius: 50,
          notifyOnEnter: true,
          notifyOnExit: false,
        }))
      )
      await AsyncStorage.setItem('tisk_geofence_active', 'true')
    } catch {
      await AsyncStorage.setItem('tisk_geofence_active', 'false')
    }
  }

  private async stopGeofencing() {
    try {
      const isRunning = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME)
      if (isRunning) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME)
      }
    } catch {}
    await AsyncStorage.setItem('tisk_geofence_active', 'false')
  }
}

export const locationTaskService = new LocationTaskService()
