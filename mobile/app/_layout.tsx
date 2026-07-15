import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import api from '../services/api';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash screen may already be prevented from hiding.
});

export default function RootLayout() {
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore if splash screen is already hidden.
      });
    }
  }, [appReady]);

  const logoutInvalidUser = async () => {
    await AsyncStorage.removeItem('accessToken');
    router.replace('/(auth)/login');
  };

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');

      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      try {
        const patientResponse = await api.get('/patients/me');
        const role = patientResponse.data?.role;

        console.log(
          'Patient profile:',
          JSON.stringify(patientResponse.data)
        );

        if (role === 'ADMIN') {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(patient)/home');
        }

        return;
      } catch (patientError: any) {
        console.log(
          'Patient profile check failed:',
          patientError.response?.status ||
            patientError.message
        );
      }

      try {
        const staffResponse = await api.get('/doctors/me');
        const role = staffResponse.data?.role;

        if (role === 'DOCTOR') {
          router.replace('/(doctor)/queue');
        } else if (role === 'PHARMACIST') {
          router.replace('/(pharmacist)/dispense');
        } else {
          await logoutInvalidUser();
        }
      } catch (staffError: any) {
        console.log(
          'Staff profile check failed:',
          staffError.response?.status ||
            staffError.message
        );

        await logoutInvalidUser();
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      await logoutInvalidUser();
    } finally {
      setAppReady(true);
    }
  };

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { isDarkMode, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </>
  );
}