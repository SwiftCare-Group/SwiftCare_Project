import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemeProvider, useTheme } from '../context/ThemeContext';
import api, { clearLocalSession, wakeGateway } from '../services/api';
import { registerForPushNotifications } from '../services/notifications';
import {
  homeRouteForRole,
  isStaffRole,
  normalizeRole,
  type SwiftCareRole,
} from '../utils/auth';
import { isAuthenticationError } from '../utils/errors';

SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash screen may already be controlled elsewhere.
});

type NotificationData = {
  type?: string;
  route?: string;
  queueEntryId?: string;
  patientId?: string;
  departmentId?: string;
};

const PATIENT_NOTIFICATION_ROUTES = new Set([
  '/(patient)/home',
  '/(patient)/appointments',
  '/(patient)/queue',
  '/(patient)/prescription',
  '/(patient)/lab-results',
  '/(patient)/medical-history',
  '/(patient)/profile',
  '/notifications',
]);

export default function RootLayout() {
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);
  const startupRoleRef = useRef<SwiftCareRole | null>(null);

  
  const routeNotification = useCallback(
    async (data: NotificationData | undefined) => {
      if (!data) {
        return;
      }

      const storedRole = normalizeRole(
        await AsyncStorage.getItem('userRole'),
      );

      if (storedRole !== 'PATIENT') {
        return;
      }

      if (data.type === 'PATIENT_CALLED') {
        router.push('/(patient)/queue');
        return;
      }

      if (
        typeof data.route === 'string' &&
        PATIENT_NOTIFICATION_ROUTES.has(data.route)
      ) {
        router.push(data.route as never);
      }
    },
    [router],
  );

  useEffect(() => {
    // Warming Render is useful, but it must never block app startup.
    void wakeGateway();

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          void wakeGateway();
        }
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const receivedSubscription =
      Notifications.addNotificationReceivedListener(() => {
        // The system notification banner is configured globally.
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content
          .data as NotificationData;
        void routeNotification(data);
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [routeNotification]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapFromLocalSession = async () => {
      try {
        const stored = await AsyncStorage.multiGet([
          'accessToken',
          'userRole',
        ]);

        const token = stored.find(([key]) => key === 'accessToken')?.[1];
        const role = normalizeRole(
          stored.find(([key]) => key === 'userRole')?.[1],
        );

        if (!isMounted) {
          return;
        }

        if (token && role) {
          startupRoleRef.current = role;
          router.replace(homeRouteForRole(role));

          if (role === 'PATIENT') {
            // Push setup is optional and must not delay navigation.
            void registerForPushNotifications().catch(() => null);
          }
        } else {
          if (token || role) {
            await clearLocalSession().catch(() => undefined);
          }

          if (isMounted) {
            router.replace('/(auth)/login');
          }
        }
      } catch {
        await clearLocalSession().catch(() => undefined);

        if (isMounted) {
          router.replace('/(auth)/login');
        }
      } finally {
        if (isMounted) {
          setAppReady(true);
        }
      }
    };

    void bootstrapFromLocalSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!appReady) {
      return;
    }

    // Hide the native splash as soon as local navigation is decided.
    // Server validation runs separately and can never trap the user here.
    const frame = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {
        // Ignore the error if the splash screen is already hidden.
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [appReady]);

  useEffect(() => {
    if (!appReady || !startupRoleRef.current) {
      return;
    }

    let isMounted = true;
    const role = startupRoleRef.current;
    const endpoint = isStaffRole(role) ? '/doctors/me' : '/patients/me';

    const validateSessionInBackground = async () => {
      try {
        const response = await api.get(endpoint);
        const resolvedRole = normalizeRole(response.data?.role) ?? role;

        if (!isMounted) {
          return;
        }

        if (resolvedRole !== role) {
          startupRoleRef.current = resolvedRole;
          await AsyncStorage.setItem('userRole', resolvedRole);
          router.replace(homeRouteForRole(resolvedRole));
        }
      } catch (error) {
        // Only a definite authentication failure should sign the user out.
        // Render cold starts and temporary 5xx responses keep the local session.
        if (isMounted && isAuthenticationError(error)) {
          await clearLocalSession().catch(() => undefined);
          router.replace('/(auth)/login');
        }
      }
    };

    void validateSessionInBackground();

    return () => {
      isMounted = false;
    };
  }, [appReady, router]);

  useEffect(() => {
    if (!appReady) {
      return;
    }

    const handleInitialNotification = async () => {
      try {
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();

        if (lastResponse) {
          const data = lastResponse.notification.request.content
            .data as NotificationData;
          await routeNotification(data);
          await Notifications.clearLastNotificationResponseAsync();
        }
      } catch {
        // Notification routing is optional.
      }
    };

    void handleInitialNotification();
  }, [appReady, routeNotification]);

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

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const router = useRouter();

  return (
    <View style={errorStyles.container}>
      <View style={errorStyles.icon}>
        <Text style={errorStyles.iconText}>!</Text>
      </View>
      <Text style={errorStyles.title}>SwiftCare encountered a problem</Text>
      <Text style={errorStyles.message}>
        {error?.message || "The screen could not be displayed."}
      </Text>
      <TouchableOpacity style={errorStyles.primaryButton} onPress={retry}>
        <Text style={errorStyles.primaryButtonText}>Try again</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={errorStyles.secondaryButton}
        onPress={() => router.replace("/(auth)/login")}
      >
        <Text style={errorStyles.secondaryButtonText}>Return to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#F5F7FA",
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: "#FDECEC",
  },
  iconText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#D64545",
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
    color: "#17324D",
  },
  message: {
    marginTop: 10,
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#66788A",
  },
  primaryButton: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#0B8FAC",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    marginTop: 12,
    padding: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B8FAC",
  },
});
