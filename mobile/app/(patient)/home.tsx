import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';import { SafeAreaView } from 'react-native-safe-area-context';

import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../context/ThemeContext';
import { getUnreadNotificationCount } from '../../services/notificationStorage';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  {
    icon: 'pulse-outline',
    label: 'Symptom\nAssessment',
    route: '/(patient)/symptoms',
  },
  {
    icon: 'videocam-outline',
    label: 'Doctor\nConsultation',
    route: '/(patient)/consultation',
  },
  {
    icon: 'document-text-outline',
    label: 'Prescriptions',
    route: '/(patient)/prescription',
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
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
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                {getGreeting()}
                {patient?.name
                  ? `, ${patient.name.split(' ')[0]}`
                  : ''}
              </Text>

              <Text style={styles.greetingSubtext}>
                Let us make you better
              </Text>
            </View>

            <View style={styles.headerActions}>
<TouchableOpacity
  style={styles.headerIcon}
  activeOpacity={0.7}
  onPress={async () => {
    await loadUnreadNotifications();
    router.push('/notifications');
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
        {unreadCount > 9 ? '9+' : unreadCount}
      </Text>
    </View>
  )}
</TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIcon}
                activeOpacity={0.7}
                onPress={() =>
                  Alert.alert(
                    'SwiftCare',
                    'Version 1.0.0\nSmart Hospital Queue & Consultation\n\nGroup 60 — KNUST'
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

          {/* Active queue */}
          {queueStatus ? (
            <TouchableOpacity
              style={[
                styles.activeQueueCard,
                {
                  backgroundColor: colors.surface,
                },
              ]}
              activeOpacity={0.8}
              onPress={() =>
                router.push('/(patient)/queue')
              }
            >
              <View style={styles.activeQueueLeft}>
                <View
                  style={[
                    styles.activeQueueIcon,
                    {
                      backgroundColor:
                        colors.primaryLight,
                    },
                  ]}
                >
                  <Ionicons
                    name="list-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.queueTextContainer}>
                  <Text
                    style={[
                      styles.activeQueueTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {queueStatus.departmentName}
                  </Text>

                  <Text
                    style={[
                      styles.activeQueueSub,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    Current Queue{' '}
                    {queueStatus.currentPosition}
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          ) : null}

          {/* Queue number */}
          {queueStatus ? (
            <View style={styles.queueNumberCard}>
              <Text style={styles.queueNumberLabel}>
                Queue {queueStatus.currentPosition}
              </Text>

              <Text style={styles.queueNumberSub}>
                Your turn at{' '}
                {queueStatus.estimatedCallTime
                  ? new Date(
                      queueStatus.estimatedCallTime
                    ).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
              </Text>
            </View>
          ) : null}
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
          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickAction}
                activeOpacity={0.8}
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
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <Text
                  style={[
                    styles.quickActionLabel,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Clinics */}
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textPrimary },
              ]}
            >
              Hospital Clinics
            </Text>
          </View>

          {filteredDepartments.length === 0 ? (
            <View style={styles.noResults}>
              <Text
                style={[
                  styles.noResultsText,
                  { color: colors.textDisabled },
                ]}
              >
                No clinics match "{searchQuery}"
              </Text>
            </View>
          ) : (
            <View style={styles.clinicsGrid}>
              {filteredDepartments.map(department => (
                <TouchableOpacity
                  key={department.id}
                  style={styles.clinicCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    lightTap();

                    router.push({
                      pathname:
                        '/(patient)/appointments',
                      params: {
                        preSelectedDept:
                          department.id,
                      },
                    });
                  }}
                >
                  <View
                    style={[
                      styles.clinicIcon,
                      {
                        backgroundColor:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={26}
                      color={colors.primary}
                    />
                  </View>

                  <Text
                    style={[
                      styles.clinicName,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {department.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Premium upgrade */}
          {patient?.tier === 'FREE' ? (
            <TouchableOpacity
              style={styles.upgradeCard}
              activeOpacity={0.8}
              onPress={() =>
                router.push('/(patient)/profile')
              }
            >
              <LinearGradient
                colors={[
                  colors.headerGradientStart,
                  colors.headerGradientEnd,
                ]}
                style={styles.upgradeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.upgradeContent}>
                  <Ionicons
                    name="star-outline"
                    size={24}
                    color={colors.white}
                  />

                  <View style={styles.upgradeText}>
                    <Text style={styles.upgradeTitle}>
                      Upgrade to Premium
                    </Text>

                    <Text
                      style={styles.upgradeSubtext}
                    >
                      Get priority queue & live
                      consultations
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.white}
                />
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  greetingContainer: {
    flex: 1,
    paddingRight: 12,
  },

  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },

  greetingSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 28,
  },

  quickAction: {
    alignItems: 'center',
    width: (width - 40) / 3,
  },

  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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

notificationBadgeText: {
  color: Colors.white,
  fontSize: 10,
  fontWeight: '700',
},
});