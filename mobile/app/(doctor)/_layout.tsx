import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { Colors } from '../../constants/colors';

export default function DoctorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textDisabled,
        tabBarHideOnKeyboard: true,

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },

        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingTop: 7,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
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
    title: "Current Patient",
    tabBarLabel: "Current Patient",
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons
        name={focused ? "medical" : "medical-outline"}
        size={size}
        color={color}
      />
    ),
  }}
/>
      <Tabs.Screen
        name="consultation-video"
        options={{
          href: null,
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