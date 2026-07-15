import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '../../context/ThemeContext';

export default function PatientLayout() {
  const { colors, isDarkMode } = useTheme();

  return (

    
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,

       tabBarStyle: {
  backgroundColor: colors.surface,
  borderTopColor: colors.border,
  borderTopWidth: 1,
  height: 68,
  paddingTop: 5,
  paddingBottom: 8,
},
tabBarLabelStyle: {
  fontSize: 10,
  fontWeight: '600',
},
        tabBarHideOnKeyboard: true,

        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'list' : 'list-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
  name="services"
  options={{
    title: 'Services',
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons
        name={focused ? 'apps' : 'apps-outline'}
        size={size}
        color={color}
      />
    ),
  }}
/>

<Tabs.Screen
  name="profile"
  options={{
    title: 'Profile',
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons
        name={focused ? 'person' : 'person-outline'}
        size={size}
        color={color}
      />
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
    </Tabs>

  );
}

