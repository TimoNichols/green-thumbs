import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEY = '@green_thumbs_notifications_enabled';

// Show alerts when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('plant-care', {
      name: 'Plant care reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: true,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationsEnabled() {
  try {
    const val = await AsyncStorage.getItem(PREF_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export async function setNotificationsEnabled(enabled) {
  try {
    await AsyncStorage.setItem(PREF_KEY, String(enabled));
    if (!enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  } catch {}
}

// Returns the scheduled notification ID, or null if skipped/failed.
export async function scheduleTaskNotification(plantName, taskLabel, dueDate) {
  try {
    const enabled = await getNotificationsEnabled();
    if (!enabled) return null;

    const trigger = new Date(dueDate);
    trigger.setHours(9, 0, 0, 0);

    if (trigger.getTime() <= Date.now()) return null;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Plant care reminder',
        body: `${plantName} needs ${taskLabel.toLowerCase()}`,
        sound: true,
      },
      trigger: { date: trigger },
    });
  } catch {
    return null;
  }
}

export async function cancelTaskNotification(notifId) {
  if (!notifId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch {}
}
