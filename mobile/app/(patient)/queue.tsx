import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addNotification } from '../../services/notificationStorage';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';
import { QueueSkeleton } from '../../components/SkeletonCard';


type QueueStatus = {
  currentPosition?: number;
  estimatedCallTime?: string;
  totalInQueue?: number;
  isEmergency?: boolean;
};

export default function QueueScreen() {
  const { colors } = useTheme();
  const { lightTap, warningNotification } = useHaptics();
const [lastNotifiedPositions, setLastNotifiedPositions] =
  useState<Record<string, number>>({});
    const QUEUE_NOTIFICATION_KEY =
  'swiftcareQueueNotificationPositions';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueStatuses, setQueueStatuses] = useState<
    Record<string, QueueStatus | null>
  >({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLastNotifiedPositions = async () => {
  try {
    const saved = await AsyncStorage.getItem(
      QUEUE_NOTIFICATION_KEY
    );

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed && typeof parsed === 'object') {
        setLastNotifiedPositions(parsed);
      }
    }
  } catch (error) {
    console.error(
      'Failed to load queue notification positions:',
      error
    );
  }
};

const saveLastNotifiedPositions = async (
  positions: Record<string, number>
) => {
  try {
    await AsyncStorage.setItem(
      QUEUE_NOTIFICATION_KEY,
      JSON.stringify(positions)
    );
  } catch (error) {
    console.error(
      'Failed to save queue notification positions:',
      error
    );
  }
};

  const fetchData = async () => {
    try {
      const response = await api.get('/appointments');

      const allAppointments = Array.isArray(response.data)
        ? response.data
        : [];

      const pendingAppointments = allAppointments.filter(
        (appointment: Appointment) =>
          appointment.status === 'PENDING'
      );

      setAppointments(pendingAppointments);

      const statuses: Record<string, QueueStatus | null> = {};

      await Promise.all(
        pendingAppointments.map(async (appointment: Appointment) => {
          try {
            const queueResponse = await api.get(
              `/appointments/${appointment.id}/queue`
            );

            statuses[appointment.id] = queueResponse.data;
          } catch (error) {
            console.error(
              `Failed to fetch queue for appointment ${appointment.id}:`,
              error
            );

            statuses[appointment.id] = null;
          }
        })
      );

      for (const appointment of pendingAppointments) {
  const queue = statuses[appointment.id];
  const currentPosition = queue?.currentPosition;

  if (
    currentPosition !== 1 &&
    currentPosition !== 2
  ) {
    continue;
  }

  const alreadyNotified =
    lastNotifiedPositions[appointment.id] ===
    currentPosition;

  if (alreadyNotified) {
    continue;
  }

  await addNotification({
    title:
      currentPosition === 1
        ? 'You Are Next'
        : 'Almost Your Turn',
    message:
      currentPosition === 1
        ? `Please proceed to ${
            appointment.departmentName ||
            'the clinic'
          }. You are next in the queue.`
        : `You are now number 2 in the ${
            appointment.departmentName ||
            'clinic'
          } queue. Please prepare to proceed.`,
    type: 'queue',
  });

setLastNotifiedPositions(previous => {
  const updated = {
    ...previous,
    [appointment.id]: currentPosition,
  };

  saveLastNotifiedPositions(updated);

  return updated;
});}
      setQueueStatuses(statuses);
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
      setAppointments([]);
      setQueueStatuses({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

useEffect(() => {
  loadLastNotifiedPositions();
  fetchData();

  const interval = setInterval(() => {
    fetchData();
  }, 30000);

  return () => clearInterval(interval);
}, []);  const onRefresh = useCallback(() => {
    lightTap();
    setRefreshing(true);
    fetchData();
  }, [lightTap]);

  const handleCancel = (appointmentId: string) => {
    lightTap();

    Alert.alert(
      'Leave Queue',
      'Are you sure you want to cancel this appointment and leave the queue?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Leave',
          style: 'destructive',
          onPress: async () => {
            warningNotification();

            try {
              await api.put(
                `/appointments/${appointmentId}/cancel`
              );

              Alert.alert(
                'Queue Left',
                'Your appointment has been cancelled.'
              );

              await fetchData();
            } catch (error: any) {
              Alert.alert(
                'Cancellation Failed',
                error.response?.data?.message ||
                  'Failed to cancel the appointment.'
              );
            }
          },
        },
      ]
    );
  };

  const formatTime = (value?: string) => {
    if (!value) {
      return '--:--';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }

    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  };

 if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient
          colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Queue Details</Text>
          <Text style={styles.headerSubtitle}>Loading your queue position...</Text>
        </LinearGradient>
        <QueueSkeleton />
      </SafeAreaView>
    );
  }

  
  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.headerGradientStart,
        },
      ]}
      edges={['top']}
    >
      <LinearGradient
        colors={[
          colors.headerGradientStart,
          colors.headerGradientEnd,
        ]}
        style={styles.header}
      >
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Queue Details
            </Text>

            <Text style={styles.headerSubtitle}>
              Your position refreshes every 30 seconds
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            activeOpacity={0.7}
            onPress={onRefresh}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {appointments.length === 0 ? (
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
                styles.emptyIconContainer,
                {
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <Ionicons
                name="list-outline"
                size={44}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              You are not in any queue
            </Text>

            <Text
              style={[
                styles.emptySubtext,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Book an appointment to receive a queue number and
              estimated consultation time.
            </Text>
          </View>
        ) : (
          appointments.map(appointment => {
            const queue = queueStatuses[appointment.id];

            const currentPosition =
              queue?.currentPosition ?? null;

            const totalInQueue =
              queue?.totalInQueue ?? null;

            return (
              <View
                key={appointment.id}
                style={[
                  styles.queueCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Clinic information */}
                <View style={styles.clinicRow}>
                  <View
                    style={[
                      styles.clinicIconBox,
                      {
                        backgroundColor: colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.clinicInfo}>
                    <Text
                      style={[
                        styles.clinicName,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      {appointment.departmentName ||
                        'Hospital Department'}
                    </Text>

                    <Text
                      style={[
                        styles.registrationTime,
                        {
                          color: colors.textSecondary,
                        },
                      ]}
                    >
                      Registered at{' '}
                      {formatTime(appointment.createdAt)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.liveBadge,
                      {
                        backgroundColor: colors.successLight,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.liveDot,
                        {
                          backgroundColor: colors.success,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.liveBadgeText,
                        {
                          color: colors.success,
                        },
                      ]}
                    >
                      Live
                    </Text>
                  </View>
                </View>

                {/* Queue position */}
                <View
                  style={[
                    styles.queueNumberSection,
                    {
                      backgroundColor:
                        colors.surfaceSecondary,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.queueSmallLabel,
                        {
                          color: colors.textSecondary,
                        },
                      ]}
                    >
                      Your queue position
                    </Text>

                    <Text
                      style={[
                        styles.queueLabel,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      {currentPosition !== null
                        ? `#${currentPosition}`
                        : '—'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.queueIconCircle,
                      {
                        backgroundColor: colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="people-outline"
                      size={23}
                      color={colors.primary}
                    />
                  </View>
                </View>

                <Text
                  style={[
                    styles.queueSub,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  {currentPosition !== null &&
                  totalInQueue !== null
                    ? `Position ${currentPosition} of ${totalInQueue}`
                    : currentPosition !== null
                      ? `Current position ${currentPosition}`
                      : 'Waiting for queue assignment'}
                </Text>

                {/* Estimated call time */}
                <LinearGradient
                  colors={[
                    colors.headerGradientStart,
                    colors.headerGradientEnd,
                  ]}
                  style={styles.timeCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.timeCardLeft}>
                    <View style={styles.timeIconCircle}>
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={colors.white}
                      />
                    </View>

                    <Text style={styles.timeLabel}>
                      Estimated call time
                    </Text>
                  </View>

                  <Text style={styles.timeValue}>
                    {formatTime(queue?.estimatedCallTime)}
                  </Text>
                </LinearGradient>

                {/* Emergency message */}
                {queue?.isEmergency ? (
                  <View
                    style={[
                      styles.emergencyBanner,
                      {
                        backgroundColor:
                          colors.severityCriticalBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={18}
                      color={colors.white}
                    />

                    <View style={styles.bannerTextContainer}>
                      <Text style={styles.emergencyTitle}>
                        Emergency priority
                      </Text>

                      <Text style={styles.emergencyText}>
                        You have been placed in the priority queue.
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Position messages */}
                {currentPosition === 1 ? (
                  <View
                    style={[
                      styles.alertBanner,
                      {
                        backgroundColor: colors.successLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={19}
                      color={colors.success}
                    />

                    <Text
                      style={[
                        styles.alertText,
                        {
                          color: colors.success,
                        },
                      ]}
                    >
                      You are next. Please proceed to the clinic.
                    </Text>
                  </View>
                ) : null}

                {currentPosition === 2 ? (
                  <View
                    style={[
                      styles.alertBanner,
                      {
                        backgroundColor: colors.warningLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={19}
                      color={colors.warning}
                    />

                    <Text
                      style={[
                        styles.alertText,
                        {
                          color: colors.warning,
                        },
                      ]}
                    >
                      Almost your turn. Please head to the hospital
                      soon.
                    </Text>
                  </View>
                ) : null}

                {/* QR information */}
                <View
                  style={[
                    styles.qrHintBox,
                    {
                      backgroundColor:
                        colors.surfaceSecondary,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.qrIconBox,
                      {
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name="qr-code-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>

                  <Text
                    style={[
                      styles.qrHintText,
                      {
                        color: colors.textSecondary,
                      },
                    ]}
                  >
                    Present your queue details at the clinic
                    administration when your number is called.
                  </Text>
                </View>

                {/* Appointment metadata */}
                <View
                  style={[
                    styles.metaRow,
                    {
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.metaItem}>
                    <Text
                      style={[
                        styles.metaLabel,
                        {
                          color: colors.textDisabled,
                        },
                      ]}
                    >
                      Patient
                    </Text>

                    <Text
                      style={[
                        styles.metaValue,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      You
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.metaDivider,
                      {
                        backgroundColor: colors.border,
                      },
                    ]}
                  />

                  <View style={styles.metaItem}>
                    <Text
                      style={[
                        styles.metaLabel,
                        {
                          color: colors.textDisabled,
                        },
                      ]}
                    >
                      Queue number
                    </Text>

                    <Text
                      style={[
                        styles.metaValue,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      {currentPosition ?? '—'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.metaDivider,
                      {
                        backgroundColor: colors.border,
                      },
                    ]}
                  />

                  <View style={styles.metaItem}>
                    <Text
                      style={[
                        styles.metaLabel,
                        {
                          color: colors.textDisabled,
                        },
                      ]}
                    >
                      Appointment
                    </Text>

                    <Text
                      style={[
                        styles.metaValue,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      {formatDate(appointment.scheduledTime)}
                    </Text>
                  </View>
                </View>

                {/* Leave queue */}
                <TouchableOpacity
                  style={[
                    styles.leaveButton,
                    {
                      borderColor: colors.danger,
                      backgroundColor: colors.dangerLight,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    handleCancel(appointment.id)
                  }
                >
                  <Ionicons
                    name="exit-outline"
                    size={18}
                    color={colors.danger}
                  />

                  <Text
                    style={[
                      styles.leaveButtonText,
                      {
                        color: colors.danger,
                      },
                    ]}
                  >
                    Leave Queue
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 16,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },

  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 4,
  },

  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
    borderWidth: 1,
    borderRadius: 18,
  },

  emptyIconContainer: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptySubtext: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 290,
  },

  queueCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },

  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  clinicIconBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  clinicInfo: {
    flex: 1,
  },

  clinicName: {
    fontSize: 15,
    fontWeight: '700',
  },

  registrationTime: {
    fontSize: 12,
    marginTop: 3,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  queueNumberSection: {
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  queueSmallLabel: {
    fontSize: 12,
    marginBottom: 4,
  },

  queueLabel: {
    fontSize: 32,
    fontWeight: '800',
  },

  queueIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  queueSub: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 16,
  },

  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 13,
    padding: 15,
    marginBottom: 14,
  },

  timeCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  timeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  timeLabel: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '500',
  },

  timeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },

  emergencyBanner: {
    borderRadius: 11,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  emergencyTitle: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },

  emergencyText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },

  bannerTextContainer: {
    flex: 1,
    marginLeft: 9,
  },

  alertBanner: {
    borderRadius: 11,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  alertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginLeft: 8,
  },

  qrHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    padding: 12,
    marginBottom: 16,
  },

  qrIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  qrHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 15,
    marginBottom: 15,
  },

  metaItem: {
    flex: 1,
    alignItems: 'center',
  },

  metaDivider: {
    width: 1,
    height: 30,
  },

  metaLabel: {
    fontSize: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  leaveButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  leaveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});