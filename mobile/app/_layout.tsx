import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ThemeProvider, useTheme } from "../context/ThemeContext";
import api from "../services/api";
import { registerForPushNotifications } from "../services/notifications";

// Keep the native splash screen visible while authentication is checked.
SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash screen may already be controlled elsewhere.
});

SplashScreen.setOptions({
  duration: 800,
  fade: true,
});

type NotificationData = {
  type?: string;
  route?: string;
  queueEntryId?: string;
  patientId?: string;
  departmentId?: string;
};

const SAFE_NOTIFICATION_ROUTES = new Set([
  "/(patient)/home",
  "/(patient)/appointments",
  "/(patient)/queue",
  "/(patient)/prescription",
  "/(patient)/lab-results",
  "/(patient)/medical-history",
  "/(patient)/profile",
  "/notifications",
]);

export default function RootLayout() {
  const router = useRouter();

  const [appReady, setAppReady] = useState(false);

  /*
   * Register global notification listeners.
   *
   * These listeners remain active regardless of whether the patient is
   * currently on the home screen, queue screen, or another screen.
   */
  useEffect(() => {
    const receivedSubscription =
      Notifications.addNotificationReceivedListener(() => {
        // The operating system displays the notification while the app is open.
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as NotificationData;


        if (data?.type === "PATIENT_CALLED") {
          router.push("/(patient)/queue");
          return;
        }

        /*
         * This supports future SwiftCare notifications that provide
         * a destination route in the notification data.
         */
        if (
          typeof data?.route === "string" &&
          SAFE_NOTIFICATION_ROUTES.has(data.route)
        ) {
          router.push(data.route as never);
        }
      });

    /*
     * Handle a notification that launched the application from a
     * terminated state.
     */
    const handleInitialNotification = async () => {
      try {
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();

        if (!lastResponse) {
          return;
        }

        const data = lastResponse.notification.request.content
          .data as NotificationData;

        if (data?.type === "PATIENT_CALLED") {
          router.push("/(patient)/queue");
          return;
        }

        if (
          typeof data?.route === "string" &&
          SAFE_NOTIFICATION_ROUTES.has(data.route)
        ) {
          router.push(data.route as never);
        }
      } catch {
        // Notification routing is optional; authentication can continue normally.
      }
    };

    void handleInitialNotification();

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);

  /*
   * Check the stored access token and determine whether the account is
   * a patient, administrator, doctor, or pharmacist.
   */
  useEffect(() => {
    let isMounted = true;

    const logoutInvalidUser = async () => {
      try {
        await AsyncStorage.multiRemove([
          "accessToken",
          "refreshToken",
          "userRole",
        ]);
      } catch {
        // Continue to the login screen even if local storage cleanup fails.
      }

      if (isMounted) {
        router.replace("/(auth)/login");
      }
    };

    const registerPatientNotifications = async () => {
      try {
        const pushToken =
          await registerForPushNotifications();

        if (!pushToken) {
          return;
        }
      } catch {
        // Push registration is optional and must not block app startup.
      }
    };

    const checkAuthentication = async () => {
      try {
        const token =
          await AsyncStorage.getItem("accessToken");

        if (!token) {
          if (isMounted) {
            router.replace("/(auth)/login");
          }

          return;
        }

        /*
         * First check whether the authenticated account belongs to a
         * patient or administrator.
         */
        try {
          const patientResponse =
            await api.get("/patients/me");

          const patientProfile =
            patientResponse.data;

          const role = String(
            patientProfile?.role ?? "PATIENT"
          ).toUpperCase();

          if (!isMounted) {
            return;
          }

          if (role === "ADMIN") {
            router.replace("/(admin)/dashboard");
            return;
          }

          /*
           * Only patient accounts need to register for the
           * PATIENT_CALLED notification at this stage.
           */
          router.replace("/(patient)/home");
          void registerPatientNotifications();

          return;
        } catch {
          // Staff accounts are not present in the patient service; check staff next.
        }

        /*
         * If the account was not found through the patient endpoint,
         * check whether it is a doctor or pharmacist account.
         */
        try {
          const staffResponse =
            await api.get("/doctors/me");

          const staffProfile =
            staffResponse.data;

          const role = String(
            staffProfile?.role ?? ""
          ).toUpperCase();

          if (!isMounted) {
            return;
          }

          if (role === "DOCTOR") {
            router.replace("/(doctor)/queue");
            return;
          }

          if (role === "PHARMACIST") {
            router.replace(
              "/(pharmacist)/dispense"
            );
            return;
          }

          if (role === "ADMIN") {
            router.replace("/(admin)/dashboard");
            return;
          }

          if (role === "LAB_TECHNICIAN") {
            router.replace("/(lab)/dashboard");
            return;
          }

          await logoutInvalidUser();
        } catch {
          await logoutInvalidUser();
        }
      } catch (error) {
        await logoutInvalidUser();
      } finally {
        if (isMounted) {
          setAppReady(true);
        }
      }
    };

    void checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, [router]);

  /*
   * Hide the native splash screen only after the authentication check
   * has finished.
   */
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
      <StatusBar
        style={isDarkMode ? "light" : "dark"}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor:
              colors.background,
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
