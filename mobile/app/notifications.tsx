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
import { goBackOrReplace } from '../utils/navigation';

import { useTheme } from '../context/ThemeContext';
import {
  NotificationItem,
  clearNotifications,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationStorage';



export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoadError(null);
    try {
      const savedNotifications = await getNotifications();
      setNotifications(savedNotifications);
    } catch {
      setLoadError('Notifications could not be loaded from this device.');
    } finally {
      setLoading(false);
    }
  };

  const runStorageOperation = async (
    operation: () => Promise<void>,
    failureMessage: string,
  ) => {
    if (saving) {
      return;
    }

    setSaving(true);
    setOperationError(null);
    try {
      await operation();
      await loadNotifications();
    } catch {
      setOperationError(failureMessage);
    } finally {
      setSaving(false);
    }
  };

  const markAsRead = async (id: string) => {
    await runStorageOperation(
      () => markNotificationAsRead(id),
      'This notification could not be updated.',
    );
  };

  const markAllAsRead = async () => {
    await runStorageOperation(
      markAllNotificationsAsRead,
      'Notifications could not be marked as read.',
    );
  };

  const clearAll = async () => {
    await runStorageOperation(
      clearNotifications,
      'Notifications could not be cleared.',
    );
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

    if (Number.isNaN(date.getTime())) {
      return 'Unknown time';
    }

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
          onPress={() => goBackOrReplace(router, '/(patient)/home')}
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
          onPress={() => void markAllAsRead()}
          disabled={saving || notifications.length === 0}
          accessibilityLabel="Mark all notifications as read"
        >
          <Ionicons
            name="checkmark-done-outline"
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {loadError ? (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: colors.surface, borderColor: colors.danger },
          ]}
        >
          <Ionicons name="warning-outline" size={20} color={colors.danger} />
          <Text style={[styles.errorBannerText, { color: colors.textPrimary }]}>
            {loadError}
          </Text>
          <TouchableOpacity onPress={() => void loadNotifications()}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {operationError ? (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: colors.surface, borderColor: colors.danger },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={[styles.errorBannerText, { color: colors.textPrimary }]}>
            {operationError}
          </Text>
          <TouchableOpacity onPress={() => setOperationError(null)}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
            onPress={() => void clearAll()}
            disabled={saving}
            accessibilityLabel="Clear all notifications"
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
              onPress={() => void markAsRead(item.id)}
              disabled={saving || item.read}
              accessibilityLabel={`${item.read ? 'Read' : 'Unread'} notification: ${item.title}`}
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

  errorBanner: {
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  errorBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },

  retryText: {
    fontSize: 12,
    fontWeight: '700',
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