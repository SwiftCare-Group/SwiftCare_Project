import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import api from './api';

const NOTIFICATION_CHANNEL_ID = 'swiftcare-alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const createAndroidNotificationChannel =
  async (): Promise<void> => {
    if (Platform.OS !== 'android') {
      return;
    }

    await Notifications.setNotificationChannelAsync(
      NOTIFICATION_CHANNEL_ID,
      {
        name: 'SwiftCare Alerts',
        description:
          'Appointment, consultation and patient queue alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0B8FAC',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      }
    );
  };

const getExpoProjectId = (): string | undefined => {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId
  );
};

export const registerForPushNotifications =
  async (): Promise<string | null> => {
    try {
      await createAndroidNotificationChannel();

      if (!Device.isDevice) {
        console.warn(
          'Remote push notifications require a physical device.'
        );

        return null;
      }

      const currentPermission =
        await Notifications.getPermissionsAsync();

      let permissionStatus = currentPermission.status;

      if (permissionStatus !== 'granted') {
        const requestedPermission =
          await Notifications.requestPermissionsAsync();

        permissionStatus = requestedPermission.status;
      }

      if (permissionStatus !== 'granted') {
        console.warn(
          'The user did not grant notification permission.'
        );

        return null;
      }

      const projectId = getExpoProjectId();

      if (!projectId) {
        throw new Error(
          'The EAS project ID is missing from app.json.'
        );
      }

      const tokenResult =
        await Notifications.getExpoPushTokenAsync({
          projectId,
        });

      const expoPushToken = tokenResult.data;

      console.log(
        'EXPO PUSH TOKEN:',
        expoPushToken
      );

      /*
       * Enable this request after the backend device-token
       * endpoint has been created.
       */
      
      await api.post('/notifications/devices', {
        token: expoPushToken,
        platform: Platform.OS.toUpperCase(),
        provider: 'EXPO',
      });
      

      return expoPushToken;
    } catch (error: any) {
      console.error(
        'PUSH NOTIFICATION REGISTRATION ERROR:',
        {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        }
      );

      return null;
    }
  };

export const getNotificationChannelId = () =>
  NOTIFICATION_CHANNEL_ID;