import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '../context/ThemeContext';
import {
  NotificationItem,
  clearNotifications,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  saveNotifications,
} from '../services/notificationStorage';


const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Welcome to SwiftCare',
    message:
      'Your account is ready. You can now book appointments and monitor your queue position.',
    type: 'system',
    createdAt: new Date().toISOString(),
    read: false,
  },
  {
    id: '2',
    title: 'Appointment reminders',
    message:
      'Enable appointment reminders in Settings so you do not miss upcoming visits.',
    type: 'appointment',
    createdAt: new Date().toISOString(),
    read: false,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

const loadNotifications = async () => {
  try {
    const savedNotifications =
      await getNotifications();

    if (savedNotifications.length === 0) {
      setNotifications(DEFAULT_NOTIFICATIONS);

await saveNotifications(DEFAULT_NOTIFICATIONS);    } else {
      setNotifications(savedNotifications);
    }
  } catch (error) {
    console.error(
      'Failed to load notifications:',
      error
    );
  } finally {
    setLoading(false);
  }
};

const markAsRead = async (id: string) => {
  await markNotificationAsRead(id);
  await loadNotifications();
};

const markAllAsRead = async () => {
  await markAllNotificationsAsRead();
  await loadNotifications();
};

const clearAll = async () => {
  await clearNotifications();
  setNotifications([]);
};
  const getIcon = (
    type: NotificationItem['type']
  ): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'appointment':
        return 'calendar-outline';

      case 'queue':
        return 'people-outline';

      case 'prescription':
        return 'medical-outline';

      default:
        return 'notifications-outline';
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.surface,
        },
      ]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          Notifications
        </Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={markAllAsRead}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{
          backgroundColor: colors.background,
        }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length > 0 ? (
          <TouchableOpacity
            style={[
              styles.clearButton,
              {
                borderColor: colors.danger,
              },
            ]}
            onPress={clearAll}
          >
            <Text
              style={[
                styles.clearButtonText,
                {
                  color: colors.danger,
                },
              ]}
            >
              Clear all notifications
            </Text>
          </TouchableOpacity>
        ) : null}

        {notifications.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              No notifications
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Appointment, queue and prescription updates
              will appear here.
            </Text>
          </View>
        ) : (
          notifications.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: item.read
                    ? colors.border
                    : colors.primary,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => markAsRead(item.id)}
            >
              <View
                style={[
                  styles.notificationIcon,
                  {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name={getIcon(item.type)}
                  size={21}
                  color={colors.primary}
                />
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      {
                        color: colors.textPrimary,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>

                  {!item.read ? (
                    <View
                      style={[
                        styles.unreadDot,
                        {
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.notificationMessage,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  {item.message}
                </Text>

                <Text
                  style={[
                    styles.notificationDate,
                    {
                      color: colors.textDisabled,
                    },
                  ]}
                >
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    height: 60,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  clearButton: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },

  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  notificationCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
  },

  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  notificationContent: {
    flex: 1,
  },

  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },

  notificationMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  notificationDate: {
    fontSize: 10,
    marginTop: 8,
  },

  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});