import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
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
      console.log('Patient me response:', JSON.stringify(response.data));
      const role = response.data.role;
      console.log('Role detected:', role);

      if (role === 'ADMIN') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(patient)/home');
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
    </>
  );
}