import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { Task } from '../types/api'

const CHANNEL_ID = 'tisk-tasks'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

class NotificationService {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false
    if (!Device.isDevice) return false

    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === 'granted') return true

    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  }

  async setupChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Task Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      })
    }
  }

  async cancelAllScheduled() {
    await Notifications.cancelAllScheduledNotificationsAsync()
  }

  async scheduleTaskNotifications(tasks: Task[]) {
    await this.cancelAllScheduled()

    const now = new Date()

    for (const task of tasks) {
      if (task.completed || !task.dueDate) continue

      const dueDate = new Date(task.dueDate.includes('T') ? task.dueDate : task.dueDate + 'T09:00:00')
      const overdueTrigger = new Date(dueDate.getTime())
      overdueTrigger.setDate(overdueTrigger.getDate() + 2)

      // Due date reminder — schedule at 9 AM on the due date
      if (dueDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Task Due Today',
            body: `"${task.title}" is due today. Time to get it done!`,
            data: { taskId: task.id, type: 'due_date' },
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dueDate,
          },
        })
      }

      // Overdue reminder — schedule at 9 AM, 2 days after due date
      if (overdueTrigger > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Overdue Task',
            body: `"${task.title}" is 2 days past due. Don't forget to complete it!`,
            data: { taskId: task.id, type: 'overdue' },
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: overdueTrigger,
          },
        })
      }
    }
  }

  async sendLocationReminder(task: Task) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'You\'re Near a Task',
        body: `You're close to "${task.title}". Check it off!`,
        data: { taskId: task.id, type: 'location' },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: null,
    })
  }
}

export const notificationService = new NotificationService()
