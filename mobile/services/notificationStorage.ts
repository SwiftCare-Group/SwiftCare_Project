import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType =
  | 'appointment'
  | 'queue'
  | 'prescription'
  | 'system';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
};



export type SwiftCareSettings = {
  darkMode: boolean;  appointmentReminders: boolean;
  queueUpdates: boolean;
  prescriptionReminders: boolean;
  biometricLogin: boolean;
  
};

const SETTINGS_STORAGE_KEY = 'swiftcareSettings';

export const DEFAULT_SETTINGS: SwiftCareSettings = {
  appointmentReminders: true,
  queueUpdates: true,
  prescriptionReminders: true,
  biometricLogin: false,
  darkMode: false,
};

export const NOTIFICATION_STORAGE_KEY =
  'swiftcareNotifications';

export async function getNotifications(): Promise<
  NotificationItem[]
> {
  try {
    const saved = await AsyncStorage.getItem(
      NOTIFICATION_STORAGE_KEY
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(
      'Failed to read notifications:',
      error
    );

    return [];
  }
}

export async function addNotification(
  notification: Omit<
    NotificationItem,
    'id' | 'createdAt' | 'read'
  >
): Promise<NotificationItem | null> {
  const enabled = await notificationTypeIsEnabled(
    notification.type
  );

  if (!enabled) {
    console.log(
      `${notification.type} notification skipped because it is disabled`
    );

    return null;
  }

  const currentNotifications =
    await getNotifications();

  const newNotification: NotificationItem = {
    id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const updatedNotifications = [
    newNotification,
    ...currentNotifications,
  ];

  await AsyncStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    JSON.stringify(updatedNotifications)
  );

  return newNotification;
}
async function notificationTypeIsEnabled(
  type: NotificationType
): Promise<boolean> {
  // System notifications should always be allowed.
  if (type === 'system') {
    return true;
  }

  try {
    const savedSettings = await AsyncStorage.getItem(
      SETTINGS_STORAGE_KEY
    );

    const settings: SwiftCareSettings = savedSettings
      ? {
          ...DEFAULT_SETTINGS,
          ...JSON.parse(savedSettings),
        }
      : DEFAULT_SETTINGS;

    switch (type) {
      case 'appointment':
        return settings.appointmentReminders;

      case 'queue':
        return settings.queueUpdates;

      case 'prescription':
        return settings.prescriptionReminders;

      default:
        return true;
    }
  } catch (error) {
    console.error(
      'Failed to check notification preferences:',
      error
    );

    return true;
  }
}
export async function markNotificationAsRead(
  id: string
) {
  const notifications = await getNotifications();

  const updated = notifications.map(item =>
    item.id === id
      ? {
          ...item,
          read: true,
        }
      : item
  );

  await AsyncStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    JSON.stringify(updated)
  );
}

export async function markAllNotificationsAsRead() {
  const notifications = await getNotifications();

  const updated = notifications.map(item => ({
    ...item,
    read: true,
  }));

  await AsyncStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    JSON.stringify(updated)
  );
}

export async function clearNotifications() {
  await AsyncStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    JSON.stringify([])
  );
}

export async function getUnreadNotificationCount() {
  const notifications = await getNotifications();

  return notifications.filter(item => !item.read)
    .length;
}

export async function saveNotifications(
  notifications: NotificationItem[]
) {
  await AsyncStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    JSON.stringify(notifications)
  );
}


export async function getSettings(): Promise<SwiftCareSettings> {
  try {
    const savedSettings =
      await AsyncStorage.getItem(
        SETTINGS_STORAGE_KEY
      );

    if (!savedSettings) {
      return DEFAULT_SETTINGS;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(savedSettings),
    };

  } catch (error) {
    console.error(
      'Failed to load settings:',
      error
    );

    return DEFAULT_SETTINGS;
  }
}


export async function saveSettings(
  settings: SwiftCareSettings
) {
  try {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );

  } catch (error) {
    console.error(
      'Failed to save settings:',
      error
    );
  }
}


export async function updateSetting(
  key: keyof SwiftCareSettings,
  value: boolean
) {
  const currentSettings =
    await getSettings();

  const updatedSettings = {
    ...currentSettings,
    [key]: value,
  };

  await saveSettings(updatedSettings);

  return updatedSettings;
}