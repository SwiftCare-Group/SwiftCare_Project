import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export default function PatientLayout() {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  const renderTabIcon = (
    outlineIcon: IoniconName,
    filledIcon: IoniconName,
    color: string,
    size: number,
    focused: boolean
  ) => {
    return (
      <View
        style={{
          width: 48,
          height: 34,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused
            ? (isDarkMode ? colors.surfaceSecondary : colors.primaryLight)
            : "transparent",
        }}
      >
        <Ionicons
          name={focused ? filledIcon : outlineIcon}
          size={focused ? size + 2 : size}
          color={color}
        />
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarHideOnKeyboard: true,

        sceneStyle: {
          backgroundColor: colors.background,
        },

        tabBarStyle: {
          height: 66 + bottomPadding,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          backgroundColor: colors.surface,
          elevation: 18,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: isDarkMode ? 0.3 : 0.12,
          shadowRadius: 14,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) =>
            renderTabIcon(
              "home-outline",
              "home",
              color,
              size,
              focused
            ),
        }}
      />

      <Tabs.Screen
        name="appointments"
        options={{
          title: "Visits",
          tabBarIcon: ({ color, size, focused }) =>
            renderTabIcon(
              "calendar-outline",
              "calendar",
              color,
              size,
              focused
            ),
        }}
      />

      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
          tabBarIcon: ({ color, size, focused }) =>
            renderTabIcon(
              "list-outline",
              "list",
              color,
              size,
              focused
            ),
        }}
      />

      <Tabs.Screen
        name="services"
        options={{
          title: "Services",
          tabBarIcon: ({ color, size, focused }) =>
            renderTabIcon(
              "apps-outline",
              "apps",
              color,
              size,
              focused
            ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) =>
            renderTabIcon(
              "person-outline",
              "person",
              color,
              size,
              focused
            ),
        }}
      />

      <Tabs.Screen
        name="symptoms"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="consultation"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="prescription"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="medical-history"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="lab-results"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="subscription-checkout"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}