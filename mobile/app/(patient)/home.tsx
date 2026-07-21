import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { useHaptics } from "../../hooks/useHaptics";
import api from "../../services/api";
import { getUnreadNotificationCount } from "../../services/notificationStorage";

type Patient = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tier?: string;
  role?: string;
};

type Appointment = {
  id: string;
  status?: string;
  departmentName?: string;
};

type Consultation = {
  id: string;
  status?: string;
  doctorName?: string;
};

type Department = {
  id: string;
  name: string;
  averageConsultationMinutes?: number;
};

type QueueStatus = {
  currentPosition?: number;
  estimatedCallTime?: string;
  departmentName?: string;
};

const QUICK_ACTIONS = [
  {
    icon: "calendar-outline",
    title: "Book",
    subtitle: "Appointment",
    route: "/(patient)/appointments",
  },
  {
    icon: "pulse-outline",
    title: "AI",
    subtitle: "Symptom Check",
    route: "/(patient)/symptoms",
  },
  {
    icon: "videocam-outline",
    title: "Doctor",
    subtitle: "Consultation",
    route: "/(patient)/consultation",
  },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lightTap } = useHaptics();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [queueStatus, setQueueStatus] =
    useState<QueueStatus | null>(null);

  const [upcomingConsultation, setUpcomingConsultation] =
    useState<Consultation | null>(null);

  const [appointmentCount, setAppointmentCount] = useState(0);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUnreadNotifications = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(Number(count) || 0);
    } catch (error) {
      console.error(
        "Failed to load unread notifications:",
        error
      );

      setUnreadCount(0);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [
        patientResponse,
        appointmentsResponse,
        consultationsResponse,
        departmentsResponse,
      ] = await Promise.all([
        api.get("/patients/me"),

        api
          .get("/appointments")
          .catch(() => ({ data: [] })),

        api
          .get("/consultations")
          .catch(() => ({ data: [] })),

        api
          .get("/departments")
          .catch(() => ({ data: [] })),
      ]);

      const patientData = patientResponse.data as Patient;

      const appointments = Array.isArray(
        appointmentsResponse.data
      )
        ? (appointmentsResponse.data as Appointment[])
        : [];

      const consultations = Array.isArray(
        consultationsResponse.data
      )
        ? (consultationsResponse.data as Consultation[])
        : [];

      const departmentList = Array.isArray(
        departmentsResponse.data
      )
        ? (departmentsResponse.data as Department[])
        : [];

      setPatient(patientData);
      setAppointmentCount(appointments.length);
      setDepartments(departmentList);

      try {
        const prescriptionResponse =
          await api.get("/prescriptions");

        const prescriptions = Array.isArray(
          prescriptionResponse.data
        )
          ? prescriptionResponse.data
          : [];

        setPrescriptionCount(prescriptions.length);
      } catch {
        setPrescriptionCount(0);
      }

      const pendingAppointment = appointments.find(
        appointment =>
          appointment.status === "PENDING" ||
          appointment.status === "CONFIRMED"
      );

      if (pendingAppointment?.id) {
        try {
          const queueResponse = await api.get(
            `/appointments/${pendingAppointment.id}/queue`
          );

          setQueueStatus({
            ...queueResponse.data,
            departmentName:
              pendingAppointment.departmentName ||
              queueResponse.data?.departmentName ||
              "Hospital Department",
          });
        } catch {
          setQueueStatus(null);
        }
      } else {
        setQueueStatus(null);
      }

      const upcoming = consultations.find(
        consultation =>
          consultation.status === "SCHEDULED"
      );

      setUpcomingConsultation(upcoming ?? null);
    } catch (error: any) {
      console.error(
        "Failed to fetch home data:",
        error?.response?.data ?? error?.message ?? error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    loadUnreadNotifications();
  }, [fetchData, loadUnreadNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadNotifications();
    }, [loadUnreadNotifications])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    Promise.all([
      fetchData(),
      loadUnreadNotifications(),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [fetchData, loadUnreadNotifications]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good Morning";
    }

    if (hour < 17) {
      return "Good Afternoon";
    }

    return "Good Evening";
  }, []);

  const firstName = useMemo(() => {
    const fullName = patient?.name?.trim();

    if (!fullName) {
      return "";
    }

    return fullName.split(/\s+/)[0];
  }, [patient?.name]);

  const filteredDepartments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return departments;
    }

    return departments.filter(department =>
      String(department.name ?? "")
        .toLowerCase()
        .includes(query)
    );
  }, [departments, searchQuery]);

  const openRoute = useCallback(
    (route: string) => {
      lightTap();
      router.push(route as never);
    },
    [lightTap, router]
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          Loading your dashboard...
        </Text>
      </View>
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
      edges={["top"]}
    >
      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <LinearGradient
          colors={[
            colors.headerGradientStart,
            colors.headerGradientEnd,
          ]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={styles.brandGreetingRow}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.headerLogo}
                resizeMode="contain"
              />

              <View style={styles.greetingContainer}>
                <Text style={styles.brandName}>
                  SwiftCare
                </Text>

                <Text style={styles.greeting}>
                  {firstName
                    ? `${greeting}, ${firstName} 👋`
                    : `${greeting} 👋`}
                </Text>

                <Text style={styles.greetingSubtext}>
                  Your health is our priority today
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIcon}
                activeOpacity={0.75}
                onPress={async () => {
                  await loadUnreadNotifications();
                  router.push("/notifications" as never);
                }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={colors.white}
                />

                {unreadCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text
                      style={styles.notificationBadgeText}
                    >
                      {unreadCount > 9
                        ? "9+"
                        : String(unreadCount)}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerIcon}
                activeOpacity={0.75}
                onPress={() => {
                  Alert.alert(
                    "SwiftCare",
                    "Version 1.0.0\nSmart Hospital Queue and Consultation\n\nGroup 60 — KNUST"
                  );
                }}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={22}
                  color={colors.white}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.currentDate}>
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>

          {queueStatus ? (
            <View
              style={[
                styles.queueOverviewCard,
                {
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={styles.queueOverviewHeader}>
                <View style={styles.queueDepartmentRow}>
                  <View
                    style={[
                      styles.queueDepartmentIcon,
                      {
                        backgroundColor:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="medkit-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.queueDepartmentText}>
                    <Text
                      style={[
                        styles.queueStatusLabel,
                        {
                          color: colors.primary,
                        },
                      ]}
                    >
                      ACTIVE QUEUE
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.queueDepartmentName,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      {String(
                        queueStatus.departmentName ||
                          "Hospital Department"
                      )}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.liveBadge,
                    {
                      backgroundColor:
                        colors.primaryLight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.liveDot,
                      {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.liveBadgeText,
                      {
                        color: colors.primary,
                      },
                    ]}
                  >
                    Live
                  </Text>
                </View>
              </View>

              <View style={styles.queueDetailsRow}>
                <View style={styles.queueDetailItem}>
                  <Text
                    style={[
                      styles.queueDetailLabel,
                      {
                        color: colors.textSecondary,
                      },
                    ]}
                  >
                    Your position
                  </Text>

                  <Text
                    style={[
                      styles.queuePositionValue,
                      {
                        color: colors.primary,
                      },
                    ]}
                  >
                    {queueStatus.currentPosition != null
                      ? `#${queueStatus.currentPosition}`
                      : "--"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.queueDivider,
                    {
                      backgroundColor: colors.border,
                    },
                  ]}
                />

                <View style={styles.queueDetailItem}>
                  <Text
                    style={[
                      styles.queueDetailLabel,
                      {
                        color: colors.textSecondary,
                      },
                    ]}
                  >
                    Estimated call
                  </Text>

                  <Text
                    style={[
                      styles.queueTimeValue,
                      {
                        color: colors.textPrimary,
                      },
                    ]}
                  >
                    {queueStatus.estimatedCallTime
                      ? new Date(
                          queueStatus.estimatedCallTime
                        ).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.trackQueueButton,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  openRoute("/(patient)/queue")
                }
              >
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color={colors.white}
                />

                <Text style={styles.trackQueueButtonText}>
                  Track My Queue
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.white}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.noQueueCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.85}
              onPress={() =>
                openRoute("/(patient)/appointments")
              }
            >
              <View
                style={[
                  styles.noQueueIcon,
                  {
                    backgroundColor:
                      colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>

              <View style={styles.noQueueTextContainer}>
                <Text
                  style={[
                    styles.noQueueTitle,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  No active queue
                </Text>

                <Text
                  style={[
                    styles.noQueueSubtitle,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  Book an appointment to join a
                  department queue
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={styles.body}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.textDisabled}
            />

            <TextInput
              style={[
                styles.searchInput,
                {
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Search clinics and departments"
              placeholderTextColor={colors.textDisabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {searchQuery.length > 0 ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSearchQuery("")}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textDisabled}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Your Health Summary
            </Text>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryCard
              icon="calendar-outline"
              value={String(appointmentCount)}
              label="Appointments"
              colors={colors}
            />

            <SummaryCard
              icon="people-outline"
              value={
                queueStatus?.currentPosition != null
                  ? `#${queueStatus.currentPosition}`
                  : "--"
              }
              label="Queue"
              colors={colors}
            />

            <SummaryCard
              icon="medkit-outline"
              value={String(prescriptionCount)}
              label="Prescriptions"
              colors={colors}
            />

            <SummaryCard
              icon="star-outline"
              value={String(patient?.tier || "FREE")}
              label="Membership"
              colors={colors}
            />
          </View>

          {upcomingConsultation ? (
            <TouchableOpacity
              style={[
                styles.upcomingBanner,
                {
                  backgroundColor:
                    colors.primaryLight,
                },
              ]}
              activeOpacity={0.8}
              onPress={() =>
                openRoute("/(patient)/consultation")
              }
            >
              <Ionicons
                name="notifications-outline"
                size={17}
                color={colors.primary}
              />

              <Text
                style={[
                  styles.upcomingText,
                  {
                    color: colors.primary,
                  },
                ]}
              >
                {upcomingConsultation.doctorName
                  ? `Upcoming consultation with Dr. ${upcomingConsultation.doctorName}`
                  : "You have an upcoming consultation"}
              </Text>

              <View
                style={[
                  styles.upcomingBadge,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text style={styles.upcomingBadgeText}>
                  Soon
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Quick Actions
            </Text>
          </View>

          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map(action => {
              return (
                <TouchableOpacity
                  key={action.title}
                  style={[
                    styles.quickActionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    openRoute(action.route)
                  }
                >
                  <View
                    style={[
                      styles.quickActionIcon,
                      {
                        backgroundColor:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={action.icon}
                      size={25}
                      color={colors.primary}
                    />
                  </View>

                  <Text
                    style={[
                      styles.quickActionTitle,
                      {
                        color: colors.textPrimary,
                      },
                    ]}
                  >
                    {action.title}
                  </Text>

                  <Text
                    style={[
                      styles.quickActionSubtitle,
                      {
                        color: colors.textSecondary,
                      },
                    ]}
                  >
                    {action.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.healthTipCard,
              {
                backgroundColor: colors.primaryLight,
              },
            ]}
          >
            <View style={styles.healthTipHeader}>
              <View
                style={[
                  styles.healthTipIcon,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="bulb-outline"
                  size={20}
                  color={colors.white}
                />
              </View>

              <Text
                style={[
                  styles.healthTipTitle,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              >
                Health Tip of the Day
              </Text>
            </View>

            <Text
              style={[
                styles.healthTipText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Drink enough water today and maintain a
              healthy routine. Small habits create
              long-term health benefits.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.emergencyCard}
            activeOpacity={0.85}
            onPress={() => {
              Alert.alert(
                "Emergency Assistance",
                "Do you want to contact emergency services?",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Continue",
                    style: "destructive",
                    onPress: () => {
                      Alert.alert(
                        "Emergency",
                        "Emergency service integration will be added before production release."
                      );
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.emergencyIcon}>
              <Ionicons
                name="call"
                size={22}
                color={Colors.white}
              />
            </View>

            <View style={styles.emergencyTextContainer}>
              <Text style={styles.emergencyTitle}>
                Emergency Assistance
              </Text>

              <Text style={styles.emergencySubtitle}>
                Get urgent medical support
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={22}
              color={Colors.danger}
            />
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Hospital Departments
            </Text>
          </View>

          {filteredDepartments.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={28}
                color={colors.textDisabled}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              >
                No departments found
              </Text>

              <Text
                style={[
                  styles.emptySubtitle,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Try entering another department name.
              </Text>
            </View>
          ) : (
            <View style={styles.departmentContainer}>
              {filteredDepartments.map(department => {
                const consultationMinutes =
                  department.averageConsultationMinutes;

                return (
                  <TouchableOpacity
                    key={String(department.id)}
                    style={[
                      styles.departmentCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      lightTap();

                      router.push({
                        pathname:
                          "/(patient)/appointments",
                        params: {
                          preSelectedDept: String(
                            department.id
                          ),
                        },
                      } as never);
                    }}
                  >
                    <View style={styles.departmentTop}>
                      <View
                        style={[
                          styles.departmentIcon,
                          {
                            backgroundColor:
                              colors.primaryLight,
                          },
                        ]}
                      >
                        <Ionicons
                          name="medical-outline"
                          size={26}
                          color={colors.primary}
                        />
                      </View>

                      <View style={styles.departmentInfo}>
                        <Text
                          style={[
                            styles.departmentName,
                            {
                              color: colors.textPrimary,
                            },
                          ]}
                        >
                          {String(
                            department.name ||
                              "Hospital Department"
                          )}
                        </Text>

                        <Text
                          style={[
                            styles.departmentWait,
                            {
                              color:
                                colors.textSecondary,
                            },
                          ]}
                        >
                          Average consultation
                        </Text>

                        <Text
                          style={[
                            styles.departmentTime,
                            {
                              color: colors.primary,
                            },
                          ]}
                        >
                          {consultationMinutes != null
                            ? `${consultationMinutes} mins`
                            : "-- mins"}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={22}
                        color={colors.primary}
                      />
                    </View>

                    <View
                      style={[
                        styles.bookDepartmentButton,
                        {
                          backgroundColor:
                            colors.primaryLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bookDepartmentText,
                          {
                            color: colors.primary,
                          },
                        ]}
                      >
                        Book Appointment
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Recent Activity
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.activityCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.85}
            onPress={() =>
              openRoute("/(patient)/appointments")
            }
          >
            <View
              style={[
                styles.activityIcon,
                {
                  backgroundColor:
                    colors.primaryLight,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.activityTextContainer}>
              <Text
                style={[
                  styles.activityTitle,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              >
                Appointment History
              </Text>

              <Text
                style={[
                  styles.activitySubtitle,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                View your previous consultations
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={colors.primary}
            />
          </TouchableOpacity>

          {patient?.tier === "FREE" ? (
            <TouchableOpacity
              style={styles.premiumCard}
              activeOpacity={0.85}
              onPress={() =>
                openRoute("/(patient)/profile")
              }
            >
              <LinearGradient
                colors={[
                  colors.headerGradientStart,
                  colors.headerGradientEnd,
                ]}
                style={styles.premiumGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.premiumHeader}>
                  <View style={styles.premiumIcon}>
                    <Ionicons
                      name="star"
                      size={24}
                      color={colors.white}
                    />
                  </View>

                  <View
                    style={styles.premiumTextContainer}
                  >
                    <Text style={styles.premiumTitle}>
                      SwiftCare Premium
                    </Text>

                    <Text style={styles.premiumSubtitle}>
                      Access faster healthcare and
                      priority queue benefits
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={colors.white}
                  />
                </View>

                <View style={styles.benefitsRow}>
                  <BenefitItem
                    icon="flash-outline"
                    label="Priority Queue"
                    color={colors.white}
                  />

                  <BenefitItem
                    icon="videocam-outline"
                    label="Video Consult"
                    color={colors.white}
                  />

                  <BenefitItem
                    icon="time-outline"
                    label="Faster Care"
                    color={colors.white}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SummaryCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  colors: any;
};

function SummaryCard({
  icon,
  value,
  label,
  colors,
}: SummaryCardProps) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor: colors.primaryLight,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.summaryValue,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.summaryLabel,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

type BenefitItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
};

function BenefitItem({
  icon,
  label,
  color,
}: BenefitItemProps) {
  return (
    <View style={styles.benefitItem}>
      <Ionicons
        name={icon}
        size={15}
        color={color}
      />

      <Text style={styles.benefitText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 120,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  brandGreetingRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },

  headerLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.white,
    marginRight: 12,
  },

  greetingContainer: {
    flex: 1,
  },

  brandName: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.82)",
    marginBottom: 2,
  },

  greeting: {
    fontSize: 19,
    fontWeight: "800",
    color: Colors.white,
  },

  greetingSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 3,
  },

  headerActions: {
    flexDirection: "row",
    gap: 8,
  },

  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "800",
  },

  currentDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 18,
    marginLeft: 68,
  },

  queueOverviewCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },

  queueOverviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  queueDepartmentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },

  queueDepartmentIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  queueDepartmentText: {
    flex: 1,
  },

  queueStatusLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
  },

  queueDepartmentName: {
    fontSize: 16,
    fontWeight: "700",
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  liveBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  queueDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 18,
  },

  queueDetailItem: {
    flex: 1,
  },

  queueDetailLabel: {
    fontSize: 12,
    marginBottom: 6,
  },

  queuePositionValue: {
    fontSize: 32,
    fontWeight: "800",
  },

  queueTimeValue: {
    fontSize: 22,
    fontWeight: "700",
  },

  queueDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 20,
  },

  trackQueueButton: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
  },

  trackQueueButtonText: {
    flex: 1,
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  noQueueCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },

  noQueueIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  noQueueTextContainer: {
    flex: 1,
    paddingRight: 10,
  },

  noQueueTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },

  noQueueSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 28,
  },

  summaryCard: {
    width: "48%",
    minHeight: 120,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
  },

  summaryLabel: {
    fontSize: 12,
    marginTop: 3,
  },

  upcomingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 24,
  },

  upcomingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },

  upcomingBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  upcomingBadgeText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: "700",
  },

  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  quickActionCard: {
    width: "31%",
    minHeight: 132,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  quickActionIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  quickActionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },

  quickActionSubtitle: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
  },

  healthTipCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },

  healthTipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  healthTipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  healthTipTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  healthTipText: {
    fontSize: 13,
    lineHeight: 19,
  },

  emergencyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    marginBottom: 24,
    backgroundColor: "#FEE2E2",
  },

  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.danger,
  },

  emergencyTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  emergencyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#B91C1C",
  },

  emergencySubtitle: {
    fontSize: 12,
    color: "#991B1B",
    marginTop: 3,
  },

  departmentContainer: {
    gap: 14,
    marginBottom: 24,
  },

  departmentCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },

  departmentTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  departmentIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  departmentInfo: {
    flex: 1,
  },

  departmentName: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },

  departmentWait: {
    fontSize: 12,
  },

  departmentTime: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },

  bookDepartmentButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },

  bookDepartmentText: {
    fontSize: 13,
    fontWeight: "700",
  },

  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
  },

  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },

  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },

  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  activityTextContainer: {
    flex: 1,
  },

  activityTitle: {
    fontSize: 14,
    fontWeight: "700",
  },

  activitySubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  premiumCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 4,
  },

  premiumGradient: {
    padding: 18,
  },

  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  premiumIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  premiumTextContainer: {
    flex: 1,
  },

  premiumTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.white,
  },

  premiumSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255,255,255,0.82)",
    marginTop: 3,
  },

  benefitsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },

  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  benefitText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
});