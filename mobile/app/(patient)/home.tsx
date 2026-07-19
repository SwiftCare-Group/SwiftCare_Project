import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';
import { HomeScreenSkeleton } from '../../components/SkeletonCard';

import { useTheme } from '../../context/ThemeContext';
import { getUnreadNotificationCount } from '../../services/notificationStorage';

const { width } = Dimensions.get('window');


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
];
export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lightTap } = useHaptics();

  const [patient, setPatient] = useState<any>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [upcomingConsultation, setUpcomingConsultation] =
    useState<any>(null);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [prescriptionCount, setPrescriptionCount] = useState(0);

  const [departments, setDepartments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async () => {
    try {
      const [
        patientRes,
        appointmentsRes,
        consultationsRes,
        departmentsRes,
      ] = await Promise.all([
        api.get('/patients/me'),
        api.get('/appointments'),
        api
          .get('/consultations')
          .catch(() => ({ data: [] })),
        api.get('/departments'),
      ]);

      setPatient(patientRes.data);
      setDepartments(departmentsRes.data);
      setAppointmentCount(
  appointmentsRes.data.length || 0
);
try {
  const prescriptionResponse = await api.get(
    "/prescriptions"
  );

  setPrescriptionCount(
    prescriptionResponse.data.length || 0
  );

} catch {
  setPrescriptionCount(0);
}

      const pendingAppointment =
        appointmentsRes.data.find(
          (appointment: any) =>
            appointment.status === 'PENDING'
        );

      if (pendingAppointment) {
        try {
          const queueResponse = await api.get(
            `/appointments/${pendingAppointment.id}/queue`
          );

          setQueueStatus({
            ...queueResponse.data,
            departmentName:
              pendingAppointment.departmentName,
          });
        } catch {
          setQueueStatus(null);
        }
      } else {
        setQueueStatus(null);
      }

      const upcoming =
        consultationsRes.data.find(
          (consultation: any) =>
            consultation.status === 'SCHEDULED'
        );

      setUpcomingConsultation(upcoming || null);
    } catch (error) {
      console.error('Failed to fetch home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnreadNotifications = async () => {
  try {
    const count = await getUnreadNotificationCount();
    setUnreadCount(count);
  } catch (error) {
    console.error(
      'Failed to load unread notifications:',
      error
    );
  }
};

useEffect(() => {
  fetchData();
  loadUnreadNotifications();
}, []); const onRefresh = useCallback(() => {
  setRefreshing(true);
  fetchData();
  loadUnreadNotifications();
}, []);
useFocusEffect(
  useCallback(() => {
    loadUnreadNotifications();
  }, [])
);

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good Morning';
    }

    if (hour < 17) {
      return 'Good Afternoon';
    }

    return 'Good Evening';
  };

  const filteredDepartments = departments.filter(
    department =>
      searchQuery.length === 0 ||
      department.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <HomeScreenSkeleton />
      </SafeAreaView>
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background },
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
          backgroundColor:
            colors.headerGradientStart,
        },
      ]}
      edges={['top']}
    >
<ScrollView
  style={[
    styles.container,
    { backgroundColor: colors.background },
  ]}
  contentContainerStyle={{
    paddingBottom: 120,
  }}
  showsVerticalScrollIndicator={false}
  refreshControl={          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.white}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
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
      <Text style={styles.brandName}>SwiftCare</Text>

      <Text style={styles.greeting}>
        {getGreeting()}
        {patient?.name
          ? `, ${patient.name.split(" ")[0]}`
          : ""}
        {" 👋"}
      </Text>

      <Text style={styles.greetingSubtext}>
        Your health is our priority today
      </Text>
    </View>
  </View>

  <View style={styles.headerActions}>
    <TouchableOpacity
      style={styles.headerIcon}
      activeOpacity={0.7}
      onPress={async () => {
        await loadUnreadNotifications();
        router.push("/notifications");
      }}
    >
      <Ionicons
        name="notifications-outline"
        size={22}
        color={colors.white}
      />

      {unreadCount > 0 && (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.headerIcon}
      activeOpacity={0.7}
      onPress={() =>
        Alert.alert(
          "SwiftCare",
          "Version 1.0.0\nSmart Hospital Queue & Consultation\n\nGroup 60 — KNUST"
        )
      }
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

          {/* Active queue */}
{/* Active queue */}
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
              backgroundColor: colors.primaryLight,
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
              { color: colors.primary },
            ]}
          >
            ACTIVE QUEUE
          </Text>

          <Text
            style={[
              styles.queueDepartmentName,
              { color: colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {queueStatus.departmentName || "Hospital Department"}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.liveBadge,
          {
            backgroundColor: colors.primaryLight,
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
            { color: colors.textSecondary },
          ]}
        >
          Your position
        </Text>

        <Text
          style={[
            styles.queuePositionValue,
            { color: colors.primary },
          ]}
        >
          #{queueStatus.currentPosition ?? "--"}
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
            { color: colors.textSecondary },
          ]}
        >
          Estimated call
        </Text>

        <Text
          style={[
            styles.queueTimeValue,
            { color: colors.textPrimary },
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
      onPress={() => {
        lightTap();
        router.push("/(patient)/queue");
      }}
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
    onPress={() => {
      lightTap();
      router.push("/(patient)/appointments");
    }}
  >
    <View
      style={[
        styles.noQueueIcon,
        {
          backgroundColor: colors.primaryLight,
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
          { color: colors.textPrimary },
        ]}
      >
        No active queue
      </Text>

      <Text
        style={[
          styles.noQueueSubtitle,
          { color: colors.textSecondary },
        ]}
      >
        Book an appointment to join a department queue
      </Text>
    </View>

    <Ionicons
      name="chevron-forward"
      size={20}
      color={colors.primary}
    />
  </TouchableOpacity>
)}

          {/* Queue number */}
         
        </LinearGradient>

        <View style={styles.body}>
          {/* Search */}

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
                { color: colors.textPrimary },
              ]}
              placeholder="Search clinics and departments"
              placeholderTextColor={
                colors.textDisabled
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textDisabled}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          {/* Health Summary */}

<View style={styles.summaryHeader}>
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
          backgroundColor:
            colors.primaryLight,
        },
      ]}
    >
      <Ionicons
        name="calendar-outline"
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
      {appointmentCount}
    </Text>

    <Text
      style={[
        styles.summaryLabel,
        {
          color:
            colors.textSecondary,
        },
      ]}
    >
      Appointments
    </Text>

  </View>


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
          backgroundColor:
            colors.primaryLight,
        },
      ]}
    >
      <Ionicons
        name="people-outline"
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
      {queueStatus
        ? `#${queueStatus.currentPosition}`
        : "--"}
    </Text>


    <Text
      style={[
        styles.summaryLabel,
        {
          color:
            colors.textSecondary,
        },
      ]}
    >
      Queue
    </Text>

  </View>


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


    <Text
      style={[
        styles.summaryValue,
        {
          color: colors.textPrimary,
        },
      ]}
    >
      {prescriptionCount}
    </Text>


    <Text
      style={[
        styles.summaryLabel,
        {
          color:
            colors.textSecondary,
        },
      ]}
    >
      Prescriptions
    </Text>

  </View>


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
          backgroundColor:
            colors.primaryLight,
        },
      ]}
    >
      <Ionicons
        name="star-outline"
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
      {patient?.tier || "FREE"}
    </Text>


    <Text
      style={[
        styles.summaryLabel,
        {
          color:
            colors.textSecondary,
        },
      ]}
    >
      Membership
    </Text>

  </View>

</View>

          {/* Upcoming consultation */}
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
                router.push(
                  '/(patient)/consultation'
                )
              }
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={colors.primary}
              />

              <Text
                style={[
                  styles.upcomingText,
                  { color: colors.primary },
                ]}
              >
                Upcoming consultation with Dr.{' '}
                {upcomingConsultation.doctorName}
              </Text>

              <View
                style={[
                  styles.upcomingBadge,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                ]}
              >
                <Text style={styles.upcomingBadgeText}>
                  Soon
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Quick actions */}
{/* Quick Actions */}
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
  {QUICK_ACTIONS.map(action => (
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
      onPress={() => {
        lightTap();
        router.push(action.route as any);
      }}
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
          name={action.icon as any}
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
  ))}
</View>

{/* Health Tip */}

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
    Drink enough water today and maintain a healthy
    routine. Small habits create long-term health
    benefits.
  </Text>

</View>

{/* Emergency Access */}

<TouchableOpacity
  style={[
    styles.emergencyCard,
    {
      backgroundColor: "#FEE2E2",
    },
  ]}
  activeOpacity={0.85}
  onPress={() =>
    Alert.alert(
      "Emergency",
      "Emergency services will be contacted."
    )
  }
>

  <View
    style={[
      styles.emergencyIcon,
      {
        backgroundColor: Colors.danger,
      },
    ]}
  >
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
{/* Hospital Departments */}

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
  <View style={styles.noResults}>
    <Text
      style={[
        styles.noResultsText,
        {
          color: colors.textDisabled,
        },
      ]}
    >
      No departments found
    </Text>
  </View>
) : (

  <View style={styles.departmentContainer}>

    {filteredDepartments.map(department => (

      <TouchableOpacity
        key={department.id}
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
              preSelectedDept:
                department.id,
            },
          });

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
                  color:
                    colors.textPrimary,
                },
              ]}
            >
              {department.name}
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
                  color:
                    colors.primary,
                },
              ]}
            >
              {department.averageConsultationMinutes ||
                "--"} mins
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
                color:
                  colors.primary,
              },
            ]}
          >
            Book Appointment
          </Text>

        </View>


      </TouchableOpacity>

    ))}

  </View>

)}          
{/* Recent Activity */}

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


<View
style={[
styles.activityCard,
{
backgroundColor: colors.surface,
borderColor: colors.border,
},
]}
>

<View style={styles.activityRow}>

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


<View>

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
color:
colors.textSecondary,
},
]}
>
View your previous consultations
</Text>

</View>


</View>

</View>
{/* Premium Upgrade */}

{patient?.tier === "FREE" ? (
  <TouchableOpacity
    style={styles.premiumCard}
    activeOpacity={0.85}
    onPress={() =>
      router.push("/(patient)/profile")
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

        <View
          style={[
            styles.premiumIcon,
            {
              backgroundColor:
                "rgba(255,255,255,0.2)",
            },
          ]}
        >
          <Ionicons
            name="star"
            size={24}
            color={colors.white}
          />
        </View>


        <View style={styles.premiumTextContainer}>

          <Text style={styles.premiumTitle}>
            SwiftCare Premium
          </Text>

          <Text style={styles.premiumSubtitle}>
            Skip queues and access faster healthcare
          </Text>

        </View>


        <Ionicons
          name="chevron-forward"
          size={22}
          color={colors.white}
        />

      </View>


      <View style={styles.benefitsRow}>

        <View style={styles.benefitItem}>
          <Ionicons
            name="flash-outline"
            size={15}
            color={colors.white}
          />

          <Text style={styles.benefitText}>
            Priority Queue
          </Text>
        </View>


        <View style={styles.benefitItem}>
          <Ionicons
            name="videocam-outline"
            size={15}
            color={colors.white}
          />

          <Text style={styles.benefitText}>
            Video Consult
          </Text>
        </View>


        <View style={styles.benefitItem}>
          <Ionicons
            name="time-outline"
            size={15}
            color={colors.white}
          />

          <Text style={styles.benefitText}>
            Faster Care
          </Text>
        </View>

      </View>

    </LinearGradient>

  </TouchableOpacity>

) : null}        </View>
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

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeQueueCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  activeQueueLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 10,
  },

  activeQueueIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  queueTextContainer: {
    flex: 1,
  },

  activeQueueTitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  activeQueueSub: {
    fontSize: 12,
    marginTop: 2,
  },

  queueNumberCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 16,
  },

  queueNumberLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },

  queueNumberSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },

  upcomingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },

  upcomingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },

  upcomingBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  upcomingBadgeText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '600',
  },

quickActionsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 28,
},
  quickAction: {
    alignItems: 'center',
    width: (width - 40) / 3,
  },

quickActionIcon: {
  width: 54,
  height: 54,
  borderRadius: 16,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 10,
},

  quickActionLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  noResults: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  noResultsText: {
    fontSize: 13,
  },

  clinicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },

  clinicCard: {
    alignItems: 'center',
    width: (width - 40 - 36) / 4,
  },

  clinicIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  clinicName: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },

  upgradeCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },

  upgradeGradient: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  upgradeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 12,
  },

  upgradeText: {
    flex: 1,
  },

  upgradeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },

  upgradeSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  notificationBadge: {
  position: 'absolute',
  top: -4,
  right: -4,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: Colors.danger,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 4,
},
brandGreetingRow: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  paddingRight: 10,
},

headerLogo: {
  width: 58,
  height: 58,
  borderRadius: 16,
  backgroundColor: Colors.white,
  marginRight: 12,
},

greetingContainer: {
  flex: 1,
},

brandName: {
  fontSize: 14,
  fontWeight: "700",
  color: "rgba(255,255,255,0.82)",
  marginBottom: 2,
},

greeting: {
  fontSize: 20,
  fontWeight: "800",
  color: Colors.white,
},
quickActionTitle: {
  fontSize: 14,
  fontWeight: "800",
  marginBottom: 2,
},
greetingSubtext: {
  fontSize: 12,
  color: "rgba(255,255,255,0.75)",
  marginTop: 3,
},

currentDate: {
  fontSize: 12,
  color: "rgba(255,255,255,0.7)",
  marginBottom: 18,
  marginLeft: 70,
},

notificationBadgeText: {
  color: Colors.white,
  fontSize: 10,
  fontWeight: '700',
},

queueOverviewCard: {
  borderRadius: 20,
  padding: 18,
  marginTop: 8,
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

quickActionSubtitle: {
  fontSize: 11,
  textAlign: "center",
  lineHeight: 15,
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
  justifyContent: "center",
  alignItems: "center",
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

quickActionCard: {
  width: (width - 56) / 3,
  minHeight: 135,
  borderRadius: 18,
  padding: 14,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
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
  marginTop: 8,
  borderWidth: 1,
},

noQueueIcon: {
  width: 48,
  height: 48,
  borderRadius: 14,
  justifyContent: "center",
  alignItems: "center",
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

departmentContainer: {
  gap: 14,
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
  justifyContent: "center",
  alignItems: "center",
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
summaryHeader: {
  marginBottom: 14,
},

summaryGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 12,
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
  justifyContent: "center",
  alignItems: "center",
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
premiumCard: {
  borderRadius: 20,
  overflow: "hidden",
  marginTop: 10,
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
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
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
  color: "rgba(255,255,255,0.8)",
  marginTop: 3,
},


benefitsRow: {
  flexDirection: "row",
  marginTop: 18,
  justifyContent: "space-between",
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
healthTipCard:{
borderRadius:18,
padding:16,
marginBottom:16,
},


healthTipHeader:{
flexDirection:"row",
alignItems:"center",
marginBottom:10,
},


healthTipIcon:{
width:36,
height:36,
borderRadius:12,
justifyContent:"center",
alignItems:"center",
marginRight:10,
},


healthTipTitle:{
fontSize:15,
fontWeight:"800",
},


healthTipText:{
fontSize:13,
lineHeight:19,
},


emergencyCard:{
flexDirection:"row",
alignItems:"center",
padding:16,
borderRadius:18,
marginBottom:24,
},


emergencyIcon:{
width:44,
height:44,
borderRadius:14,
justifyContent:"center",
alignItems:"center",
},


emergencyTextContainer:{
flex:1,
marginLeft:12,
},


emergencyTitle:{
fontSize:15,
fontWeight:"800",
color:"#B91C1C",
},


emergencySubtitle:{
fontSize:12,
color:"#991B1B",
marginTop:3,
},


activityCard:{
borderRadius:18,
borderWidth:1,
padding:16,
marginBottom:24,
},


activityRow:{
flexDirection:"row",
alignItems:"center",
},


activityIcon:{
width:42,
height:42,
borderRadius:14,
justifyContent:"center",
alignItems:"center",
marginRight:12,
},


activityTitle:{
fontSize:14,
fontWeight:"700",
},


activitySubtitle:{
fontSize:12,
marginTop:3,
},
noQueueSubtitle: {
  fontSize: 12,
  lineHeight: 17,
},

});