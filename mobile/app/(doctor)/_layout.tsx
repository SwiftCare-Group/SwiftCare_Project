import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../context/ThemeContext';

export default function DoctorLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarHideOnKeyboard: true,

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },

        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 10,
        },
      }}
    >
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Patient Queue',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="consultations"
        options={{
          title: 'Consultations',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="consultation/[queueEntryId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="consultation-video"
        options={{
        title: 'Video Visits',
        tabBarIcon: ({ color, size, focused }) => (
      <Ionicons
        name={focused ? 'videocam' : 'videocam-outline'}
        size={size}
        color={color}
      />
    ),
  }}
/>

      <Tabs.Screen
        name="patient-details"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}