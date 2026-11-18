import {
  isPermissionGranted,
  requestPermission,
  sendNotification
} from '@tauri-apps/plugin-notification';
import { isTauriApp } from '$lib/api/client';

/**
 * Checks for OS notification permissions and requests if not yet granted.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isTauriApp()) return false;
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    return granted;
  } catch (err) {
    console.warn('Failed to query notification permission:', err);
    return false;
  }
}

/**
 * Sends a native OS desktop notification with statutory DPO styling.
 */
export async function notifyDpo(title: string, body: string) {
  if (!isTauriApp()) return;
  try {
    const granted = await ensureNotificationPermission();
    if (granted) {
      sendNotification({
        title,
        body
      });
    }
  } catch (err) {
    console.warn('Failed to send native OS notification:', err);
  }
}
