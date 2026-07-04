import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
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
      // Try staff
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
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}