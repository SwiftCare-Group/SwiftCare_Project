import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import api from '../services/api';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      setAppReady(true);
      router.replace('/(auth)/login');
      return;
    }

    try {
      const response = await api.get('/patients/me');
      const role = response.data.role;

      if (role === 'ADMIN') {
        router.replace('/(admin)/dashboard');
      } else if (role === 'PATIENT') {
        router.replace('/(patient)/home');
      } else {
        // unexpected role — clear and redirect
        await AsyncStorage.removeItem('accessToken');
        router.replace('/(auth)/login');
      }
    } catch {
      try {
        const response = await api.get('/doctors/me');
        const role = response.data.role;

        if (role === 'DOCTOR') {
          router.replace('/(doctor)/queue');
        } else if (role === 'PHARMACIST') {
          router.replace('/(pharmacist)/dispense');
        } else {
          await AsyncStorage.removeItem('accessToken');
          router.replace('/(auth)/login');
        }
      } catch {
        await AsyncStorage.removeItem('accessToken');
        router.replace('/(auth)/login');
      }
    } finally {
      setAppReady(true);
    }
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}