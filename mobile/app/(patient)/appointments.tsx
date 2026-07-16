import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNotification } from '../../services/notificationStorage';
import api from '../../services/api';
import { useHaptics } from '../../hooks/useHaptics';
import { showToast } from '../../utils/toast';
import { AppointmentListSkeleton } from '../../components/SkeletonCard';

import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const DAYS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

const TIME_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '11:00',
  '13:00',
  '13:30',
];

type AppointmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

type Department = {
  id: string;
  name: string;
};

type Appointment = {
  id: string;
  departmentName?: string;
  scheduledTime: string;
  status: AppointmentStatus;
  queuePosition?: number;
  severityScore?: number;
};

export default function AppointmentsScreen() {
  const { colors } = useTheme();

  const { mediumTap, successNotification, errorNotification } =
    useHaptics();

  const { preSelectedDept } =
    useLocalSearchParams<{
      preSelectedDept?: string;
    }>();

  const [appointments, setAppointments] = useState<
    Appointment[]
  >([]);

  const [departments, setDepartments] = useState<
    Department[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const [selectedDept, setSelectedDept] =
    useState<string | null>(null);

  const [selectedDate, setSelectedDate] =
    useState<Date>(new Date());

  const [selectedTime, setSelectedTime] =
    useState('09:00');

  const [showBooking, setShowBooking] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<'hospital' | 'online'>('hospital');

  const statusColors: Record<
    AppointmentStatus,
    string
  > = {
    PENDING: colors.warning,
    ACTIVE: colors.primary,
    COMPLETED: colors.success,
    CANCELLED: colors.danger,
  };

  useEffect(() => {
    fetchAppointments();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (preSelectedDept) {
      setSelectedDept(preSelectedDept);
      setShowBooking(true);
    }
  }, [preSelectedDept]);

  const getDates = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();

    for (let index = 0; index < 7; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      dates.push(date);
    }

    return dates;
  };

  const fetchAppointments = async () => {
    try {
      const response =
        await api.get('/appointments');

      setAppointments(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      console.error(
        'Failed to fetch appointments:',
        error
      );

      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response =
        await api.get('/departments');

      setDepartments(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      console.error(
        'Failed to fetch departments:',
        error
      );

      setDepartments([]);
    }
  };

  const handleDateSelection = (date: Date) => {
    mediumTap();
    setSelectedDate(date);
  };

  const handleDepartmentSelection = (
    departmentId: string
  ) => {
    mediumTap();
    setSelectedDept(departmentId);
  };

  const handleTimeSelection = (time: string) => {
    mediumTap();
    setSelectedTime(time);
  };

  const handleBook = async () => {
    mediumTap();

    if (activeTab === 'online') {
      Alert.alert(
        'Online Consultation',
        'Online appointment booking will be available soon.'
      );

      return;
    }

    if (!selectedDept) {
      errorNotification();

      Alert.alert(
        'Department Required',
        'Please select a department before booking.'
      );

      return;
    }

    setBooking(true);

    try {
      const scheduledTime = new Date(selectedDate);

      const [hours, minutes] =
        selectedTime.split(':');

      scheduledTime.setHours(
        Number.parseInt(hours, 10),
        Number.parseInt(minutes, 10),
        0,
        0
      );

      if (scheduledTime.getTime() < Date.now()) {
        errorNotification();

        Alert.alert(
          'Invalid Time',
          'Please select a future appointment time.'
        );

        return;
      }

      const savedScore =
        await AsyncStorage.getItem(
          'lastSeverityScore'
        );

      const parsedSeverity = savedScore
        ? Number.parseInt(savedScore, 10)
        : 3;

      const severityScore = Number.isNaN(
        parsedSeverity
      )
        ? 3
        : parsedSeverity;

      await api.post('/appointments', {
        departmentId: selectedDept,
        scheduledTime: scheduledTime
          .toISOString()
          .slice(0, 19),
        severityScore,
      });
      const selectedDepartment =
  departments.find(
    department =>
      department.id === selectedDept
  );

await addNotification({
  title: 'Appointment Booked',
  message: `Your appointment with ${
    selectedDepartment?.name ||
    'the selected department'
  } has been scheduled for ${scheduledTime.toLocaleString(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }
  )}.`,
  type: 'appointment',
});



      successNotification();

      Alert.alert(
        'Appointment Booked',
        'Your appointment was booked successfully.'
      );

      showToast.success('Your appointment has been booked successfully');
      setShowBooking(false);
      setSelectedDept(null);
      setSelectedDate(new Date());
      setSelectedTime('09:00');

      await fetchAppointments();
    } catch (error: any) {
      errorNotification();
      showToast.error(error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/appointments/${appointmentId}/cancel`);
            fetchAppointments();
          } catch {
            showToast.error('Failed to cancel appointment');
          }
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',

          onPress: async () => {
            try {
              await api.put(
                `/appointments/${appointmentId}/cancel`
              );

              successNotification();

              Alert.alert(
                'Appointment Cancelled',
                'Your appointment has been cancelled.'
              );

              await fetchAppointments();
            } catch (error: any) {
              errorNotification();

              Alert.alert(
                'Cancellation Failed',
                error.response?.data?.message ||
                  'Failed to cancel appointment.'
              );
            }
          },
        },
      ]
    );
  };

  const toggleBookingForm = () => {
    mediumTap();
    setShowBooking(current => !current);
  };

  const formatAppointmentDate = (
    scheduledTime: string
  ) => {
    const date = new Date(scheduledTime);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const dates = getDates();

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient
          colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Appointments</Text>
          </View>
        </LinearGradient>
        <AppointmentListSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.headerGradientStart,
        },
      ]}
      edges={['top']}
    >
      {/* Header */}
      <LinearGradient
        colors={[
          colors.headerGradientStart,
          colors.headerGradientEnd,
        ]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>
              Appointments
            </Text>

            <Text style={styles.headerSubtitle}>
              Book and manage your hospital visits
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: colors.surface,
              },
            ]}
            activeOpacity={0.8}
            onPress={toggleBookingForm}
          >
            <Ionicons
              name={showBooking ? 'close' : 'add'}
              size={21}
              color={colors.primary}
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Booking form */}
        {showBooking ? (
          <View
            style={[
              styles.bookingCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.bookingTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Book an Appointment
            </Text>

            <Text
              style={[
                styles.bookingDescription,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Select your preferred consultation type,
              department, date and time.
            </Text>

            {/* Consultation type tabs */}
            <View
              style={[
                styles.tabToggle,
                {
                  backgroundColor:
                    colors.surfaceSecondary,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'hospital' && {
                    backgroundColor:
                      colors.primary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  mediumTap();
                  setActiveTab('hospital');
                }}
              >
                <Ionicons
                  name="business-outline"
                  size={17}
                  color={
                    activeTab === 'hospital'
                      ? colors.white
                      : colors.textSecondary
                  }
                />

                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color:
                        activeTab === 'hospital'
                          ? colors.white
                          : colors.textSecondary,
                    },
                    activeTab === 'hospital' &&
                      styles.tabButtonTextActive,
                  ]}
                >
                  Hospital
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'online' && {
                    backgroundColor:
                      colors.primary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  mediumTap();
                  setActiveTab('online');
                }}
              >
                <Ionicons
                  name="videocam-outline"
                  size={17}
                  color={
                    activeTab === 'online'
                      ? colors.white
                      : colors.textSecondary
                  }
                />

                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color:
                        activeTab === 'online'
                          ? colors.white
                          : colors.textSecondary,
                    },
                    activeTab === 'online' &&
                      styles.tabButtonTextActive,
                  ]}
                >
                  Online
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'online' ? (
              <View
                style={[
                  styles.onlineNotice,
                  {
                    backgroundColor:
                      colors.primaryLight,
                  },
                ]}
              >
                <View
                  style={[
                    styles.onlineNoticeIcon,
                    {
                      backgroundColor:
                        colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={21}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.onlineNoticeText}>
                  <Text
                    style={[
                      styles.onlineNoticeTitle,
                      {
                        color:
                          colors.textPrimary,
                      },
                    ]}
                  >
                    Online consultation
                  </Text>

                  <Text
                    style={[
                      styles.onlineNoticeDescription,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    This service is being prepared and
                    will be available soon.
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {/* Department selection */}
                <Text
                  style={[
                    styles.bookingLabel,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  Select Department
                </Text>

                {departments.length === 0 ? (
                  <View
                    style={[
                      styles.departmentEmpty,
                      {
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={24}
                      color={colors.textDisabled}
                    />

                    <Text
                      style={[
                        styles.departmentEmptyText,
                        {
                          color:
                            colors.textSecondary,
                        },
                      ]}
                    >
                      No departments are available.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    style={styles.deptScroll}
                    contentContainerStyle={
                      styles.deptScrollContent
                    }
                  >
                    {departments.map(department => {
                      const selected =
                        selectedDept ===
                        department.id;

                      return (
                        <TouchableOpacity
                          key={department.id}
                          style={[
                            styles.deptChip,
                            {
                              backgroundColor:
                                selected
                                  ? colors.primary
                                  : colors.surface,
                              borderColor: selected
                                ? colors.primary
                                : colors.border,
                            },
                          ]}
                          activeOpacity={0.8}
                          onPress={() =>
                            handleDepartmentSelection(
                              department.id
                            )
                          }
                        >
                          <Ionicons
                            name="medical-outline"
                            size={15}
                            color={
                              selected
                                ? colors.white
                                : colors.primary
                            }
                          />

                          <Text
                            style={[
                              styles.deptChipText,
                              {
                                color: selected
                                  ? colors.white
                                  : colors.textSecondary,
                              },
                              selected &&
                                styles.deptChipTextActive,
                            ]}
                          >
                            {department.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Date selection */}
                <View style={styles.dateHeader}>
                  <Text
                    style={[
                      styles.bookingLabel,
                      {
                        color:
                          colors.textPrimary,
                      },
                    ]}
                  >
                    Available Date
                  </Text>

                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.dateScroll}
                  contentContainerStyle={
                    styles.dateScrollContent
                  }
                >
                  {dates.map(date => {
                    const selected =
                      selectedDate.toDateString() ===
                      date.toDateString();

                    return (
                      <TouchableOpacity
                        key={date.toISOString()}
                        style={[
                          styles.dateCard,
                          {
                            backgroundColor: selected
                              ? colors.primary
                              : colors.surface,
                            borderColor: selected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        activeOpacity={0.8}
                        onPress={() =>
                          handleDateSelection(date)
                        }
                      >
                        <Text
                          style={[
                            styles.dateDay,
                            {
                              color: selected
                                ? colors.white
                                : colors.textPrimary,
                            },
                          ]}
                        >
                          {date.getDate()}
                        </Text>

                        <Text
                          style={[
                            styles.dateWeekday,
                            {
                              color: selected
                                ? 'rgba(255,255,255,0.82)'
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {DAYS[date.getDay()]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Time selection */}
                <Text
                  style={[
                    styles.bookingLabel,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  Select Time
                </Text>

                <View style={styles.timeGrid}>
                  {TIME_SLOTS.map(time => {
                    const selected =
                      selectedTime === time;

                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeSlot,
                          {
                            backgroundColor: selected
                              ? colors.primary
                              : colors.surface,
                            borderColor: selected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        activeOpacity={0.8}
                        onPress={() =>
                          handleTimeSelection(time)
                        }
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={
                            selected
                              ? colors.white
                              : colors.textSecondary
                          }
                        />

                        <Text
                          style={[
                            styles.timeSlotText,
                            {
                              color: selected
                                ? colors.white
                                : colors.textSecondary,
                            },
                            selected &&
                              styles.timeSlotTextActive,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Symptom hint */}
                <View
                  style={[
                    styles.symptomHint,
                    {
                      backgroundColor:
                        colors.primaryLight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.symptomHintIcon,
                      {
                        backgroundColor:
                          colors.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name="pulse-outline"
                      size={19}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.symptomHintContent}>
                    <Text
                      style={[
                        styles.symptomHintLabel,
                        {
                          color:
                            colors.textPrimary,
                        },
                      ]}
                    >
                      Symptom assessment
                    </Text>

                    <Text
                      style={[
                        styles.symptomHintText,
                        {
                          color:
                            colors.textSecondary,
                        },
                      ]}
                    >
                      Submit your symptoms first for
                      more accurate queue priority.
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Confirm booking */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor:
                    colors.primary,
                },
                (booking ||
                  activeTab === 'online') &&
                  styles.buttonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleBook}
              disabled={
                booking || activeTab === 'online'
              }
            >
              {booking ? (
                <ActivityIndicator
                  size="small"
                  color={colors.white}
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color={colors.white}
                  />

                  <Text
                    style={styles.confirmButtonText}
                  >
                    Confirm Booking
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Appointments section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Your Appointments
            </Text>

            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              View your upcoming and previous bookings
            </Text>
          </View>

          <View
            style={[
              styles.appointmentCount,
              {
                backgroundColor:
                  colors.primaryLight,
              },
            ]}
          >
            <Text
              style={[
                styles.appointmentCountText,
                {
                  color: colors.primary,
                },
              ]}
            >
              {appointments.length}
            </Text>
          </View>
        </View>

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
                styles.emptyIcon,
                {
                  backgroundColor:
                    colors.primaryLight,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={36}
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
              No appointments yet
            </Text>

            <Text
              style={[
                styles.emptySubtext,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Tap the plus button above to book your
              first appointment.
            </Text>

            <TouchableOpacity
              style={[
                styles.emptyBookButton,
                {
                  backgroundColor:
                    colors.primary,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setShowBooking(true)}
            >
              <Ionicons
                name="add"
                size={18}
                color={colors.white}
              />

              <Text
                style={styles.emptyBookButtonText}
              >
                Book Appointment
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          appointments.map(appointment => {
            const statusColor =
              statusColors[appointment.status] ??
              colors.textSecondary;

            return (
              <View
                key={appointment.id}
                style={[
                  styles.appointmentCard,
                  {
                    backgroundColor:
                      colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.aptHeader}>
                  <View
                    style={[
                      styles.aptIconBox,
                      {
                        backgroundColor:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={19}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.aptInfo}>
                    <Text
                      style={[
                        styles.aptDept,
                        {
                          color:
                            colors.textPrimary,
                        },
                      ]}
                    >
                      {appointment.departmentName ||
                        'Hospital Department'}
                    </Text>

                    <Text
                      style={[
                        styles.aptTime,
                        {
                          color:
                            colors.textSecondary,
                        },
                      ]}
                    >
                      {formatAppointmentDate(
                        appointment.scheduledTime
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          `${statusColor}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: statusColor,
                        },
                      ]}
                    >
                      {appointment.status}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.aptDivider,
                    {
                      backgroundColor:
                        colors.border,
                    },
                  ]}
                />

                <View style={styles.aptMeta}>
                  <View style={styles.aptMetaItem}>
                    <View
                      style={[
                        styles.metaIconBox,
                        {
                          backgroundColor:
                            colors.surfaceSecondary,
                        },
                      ]}
                    >
                      <Ionicons
                        name="list-outline"
                        size={15}
                        color={
                          colors.textSecondary
                        }
                      />
                    </View>

                    <View>
                      <Text
                        style={[
                          styles.metaLabel,
                          {
                            color:
                              colors.textDisabled,
                          },
                        ]}
                      >
                        Queue
                      </Text>

                      <Text
                        style={[
                          styles.metaValue,
                          {
                            color:
                              colors.textPrimary,
                          },
                        ]}
                      >
                        {appointment.queuePosition
                          ? `#${appointment.queuePosition}`
                          : 'Not assigned'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.aptMetaItem}>
                    <View
                      style={[
                        styles.metaIconBox,
                        {
                          backgroundColor:
                            colors.surfaceSecondary,
                        },
                      ]}
                    >
                      <Ionicons
                        name="analytics-outline"
                        size={15}
                        color={
                          colors.textSecondary
                        }
                      />
                    </View>

                    <View>
                      <Text
                        style={[
                          styles.metaLabel,
                          {
                            color:
                              colors.textDisabled,
                          },
                        ]}
                      >
                        Severity
                      </Text>

                      <Text
                        style={[
                          styles.metaValue,
                          {
                            color:
                              colors.textPrimary,
                          },
                        ]}
                      >
                        {appointment.severityScore ??
                          '—'}
                        /10
                      </Text>
                    </View>
                  </View>
                </View>

                {appointment.status ===
                'PENDING' ? (
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      {
                        borderColor:
                          colors.danger,
                        backgroundColor:
                          colors.dangerLight,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      handleCancel(
                        appointment.id
                      )
                    }
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={17}
                      color={colors.danger}
                    />

                    <Text
                      style={[
                        styles.cancelButtonText,
                        {
                          color: colors.danger,
                        },
                      ]}
                    >
                      Cancel Appointment
                    </Text>
                  </TouchableOpacity>
                ) : null}
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

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 3,
  },

  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bookingCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
  },

  bookingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },

  bookingDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },

  tabToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 18,
  },

  tabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 10,
  },

  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  tabButtonTextActive: {
    fontWeight: '700',
  },

  onlineNotice: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  onlineNoticeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  onlineNoticeText: {
    flex: 1,
  },

  onlineNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },

  onlineNoticeDescription: {
    fontSize: 12,
    lineHeight: 17,
  },

  bookingLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },

  departmentEmpty: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
  },

  departmentEmptyText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },

  deptScroll: {
    marginBottom: 18,
  },

  deptScrollContent: {
    paddingRight: 8,
  },

  deptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },

  deptChipText: {
    fontSize: 13,
  },

  deptChipTextActive: {
    fontWeight: '600',
  },

  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  dateScroll: {
    marginBottom: 18,
  },

  dateScrollContent: {
    paddingRight: 8,
  },

  dateCard: {
    width: 50,
    height: 66,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  dateDay: {
    fontSize: 18,
    fontWeight: '700',
  },

  dateWeekday: {
    fontSize: 11,
    marginTop: 2,
  },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },

  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },

  timeSlotText: {
    fontSize: 13,
    fontWeight: '500',
  },

  timeSlotTextActive: {
    fontWeight: '700',
  },

  symptomHint: {
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
    flexDirection: 'row',

    alignItems: 'center',
  },

  symptomHintIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  symptomHintContent: {
    flex: 1,
  },

  symptomHintLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },

  symptomHintText: {
    fontSize: 12,
    lineHeight: 17,
  },

  confirmButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },

  sectionSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  appointmentCount: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  appointmentCountText: {
    fontSize: 13,
    fontWeight: '700',
  },

  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },

  emptySubtext: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 260,
  },

  emptyBookButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 11,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  emptyBookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  appointmentCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },

  aptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  aptIconBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  aptInfo: {
    flex: 1,
    paddingRight: 6,
  },

  aptDept: {
    fontSize: 15,
    fontWeight: '700',
  },

  aptTime: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  aptDivider: {
    height: 1,
    marginVertical: 14,
  },

  aptMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },

  aptMetaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  metaIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metaLabel: {
    fontSize: 10,
    marginBottom: 2,
    textTransform: 'uppercase',
  },

  metaValue: {
    fontSize: 12,
    fontWeight: '600',
  },

  cancelButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});