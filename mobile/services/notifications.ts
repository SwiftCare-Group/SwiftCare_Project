import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<
  string | null
> {
  try {
    if (!Device.isDevice) {
      console.log(
        'Push notifications require a physical device.'
      );
      return null;
    }

    const currentPermissions =
      await Notifications.getPermissionsAsync();

    let finalStatus = currentPermissions.status;

    if (finalStatus !== 'granted') {
      const requestedPermissions =
        await Notifications.requestPermissionsAsync();

      finalStatus = requestedPermissions.status;
    }

    if (finalStatus !== 'granted') {
      console.log(
        'Push notification permission was not granted.'
      );
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error(
        'Expo project ID is missing. Check app.json and EAS configuration.'
      );
      return null;
    }

    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const expoPushToken = tokenResponse.data;

    console.log('Expo push token:', expoPushToken);

    await api.post('/notifications/devices', {
      token: expoPushToken,
      platform: Platform.OS.toUpperCase(),
      deviceName: Device.deviceName ?? undefined,
    });

    console.log(
      'Push token registered successfully with SwiftCare.'
    );

    return expoPushToken;
  } catch (error: any) {
    console.error(
      'Push notification registration failed:',
      error?.response?.data ??
        error?.message ??
        error
    );

    return null;
  }
}