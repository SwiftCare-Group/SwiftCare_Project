import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

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
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "PUSH NOTIFICATION RECEIVED:",
          notification.request.content
        );
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as NotificationData;

        console.log("PUSH NOTIFICATION OPENED:", data);

        if (data?.type === "PATIENT_CALLED") {
          router.push("/(patient)/queue");
          return;
        }

        /*
         * This supports future SwiftCare notifications that provide
         * a destination route in the notification data.
         */
        if (typeof data?.route === "string" && data.route.length > 0) {
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
        }
      } catch (error) {
        console.error(
          "FAILED TO READ INITIAL NOTIFICATION:",
          error
        );
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
        ]);
      } catch (error) {
        console.error(
          "FAILED TO CLEAR INVALID SESSION:",
          error
        );
      }

      if (isMounted) {
        router.replace("/(auth)/login");
      }
    };

    const registerPatientNotifications = async () => {
      try {
        const pushToken =
          await registerForPushNotifications();

        if (pushToken) {
          console.log(
            "PATIENT PUSH NOTIFICATIONS REGISTERED:",
            pushToken
          );
        }
      } catch (error) {
        /*
         * Notification registration should not prevent the patient
         * from entering the application.
         */
        console.error(
          "PATIENT NOTIFICATION REGISTRATION FAILED:",
          error
        );
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

          console.log(
            "PATIENT PROFILE:",
            JSON.stringify(patientProfile)
          );

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
        } catch (patientError: any) {
          console.log(
            "PATIENT PROFILE CHECK FAILED:",
            {
              status:
                patientError?.response?.status,
              data: patientError?.response?.data,
              message: patientError?.message,
            }
          );
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

          console.log(
            "STAFF PROFILE:",
            JSON.stringify(staffProfile)
          );

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

          await logoutInvalidUser();
        } catch (staffError: any) {
          console.log(
            "STAFF PROFILE CHECK FAILED:",
            {
              status:
                staffError?.response?.status,
              data: staffError?.response?.data,
              message: staffError?.message,
            }
          );

          await logoutInvalidUser();
        }
      } catch (error) {
        console.error(
          "AUTHENTICATION CHECK FAILED:",
          error
        );

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