import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import api from '../services/api';

import { ThemeProvider, useTheme } from "../context/ThemeContext";
import api from "../services/api";

// Keep the native splash screen visible while authentication is checked.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore the error if the splash screen has already been handled.
});

// Add a smooth fade when the splash screen disappears.
SplashScreen.setOptions({
  duration: 800,
  fade: true,
});
export default function RootLayout() {
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
  if (appReady) {
    SplashScreen.hideAsync().catch(() => {});
  }
}, [appReady]);



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
        const token = await AsyncStorage.getItem("accessToken");

        // No saved token: send the user to the login screen.
        if (!token) {
          router.replace("/(auth)/login");
          return;
        }

        /*
         * First check whether the logged-in account is a patient
         * or an administrator.
         */
        try {
          const patientResponse = await api.get("/patients/me");
          const role = patientResponse.data?.role;

          console.log(
            "Patient profile:",
            JSON.stringify(patientResponse.data)
          );

          if (role === "ADMIN") {
            router.replace("/(admin)/dashboard");
          } else {
            router.replace("/(patient)/home");
          }

          return;
        } catch (patientError: any) {
          console.log(
            "Patient profile check failed:",
            patientError.response?.status ?? patientError.message
          );
        }

        /*
         * If the account was not found as a patient, check whether
         * it is a doctor or pharmacist account.
         */
        try {
          const staffResponse = await api.get("/doctors/me");
          const role = staffResponse.data?.role;

          console.log(
            "Staff profile:",
            JSON.stringify(staffResponse.data)
          );

          if (role === "DOCTOR") {
            router.replace("/(doctor)/queue");
          } else if (role === "PHARMACIST") {
            router.replace("/(pharmacist)/dispense");
          } else {
            await logoutInvalidUser();
          }
        } catch (staffError: any) {
          console.log(
            "Staff profile check failed:",
            staffError.response?.status ?? staffError.message
          );

          await logoutInvalidUser();
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        await logoutInvalidUser();
      } finally {
        setAppReady(true);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!appReady) {
      return;
    }

    SplashScreen.hideAsync().catch(() => {
      // Ignore the error if the splash screen is already hidden.
    });
  }, [appReady]);

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
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}