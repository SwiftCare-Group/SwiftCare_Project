import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';


const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { icon: 'pulse-outline', label: 'Symptom\nAssessment', route: '/(patient)/symptoms' },
  { icon: 'videocam-outline', label: 'Doctor\nConsultation', route: '/(patient)/consultation' },
  { icon: 'document-text-outline', label: 'Prescriptions', route: '/(patient)/prescription' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [upcomingConsultation, setUpcomingConsultation] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { lightTap } = useHaptics();

  const fetchData = async () => {
    try {
      const [patientRes, appointmentsRes, consultationsRes, deptsRes] = await Promise.all([
        api.get('/patients/me'),
        api.get('/appointments'),
        api.get('/consultations').catch(() => ({ data: [] })),
        api.get('/departments'),
      ]);

      setPatient(patientRes.data);
      setDepartments(deptsRes.data);

      const pendingApt = appointmentsRes.data.find((a: any) => a.status === 'PENDING');
      if (pendingApt) {
        try {
          const queueRes = await api.get(`/appointments/${pendingApt.id}/queue`);
          setQueueStatus({ ...queueRes.data, departmentName: pendingApt.departmentName });
        } catch {
          setQueueStatus(null);
        }
      } else {
        setQueueStatus(null);
      }

      const upcoming = consultationsRes.data.find((c: any) => c.status === 'SCHEDULED');
      setUpcomingConsultation(upcoming || null);
    } catch (error) {
      console.error('Failed to fetch home data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const filteredDepartments = departments.filter(dept =>
    searchQuery.length === 0 ||
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}, {patient?.name?.split(' ')[0]}</Text>
              <Text style={styles.greetingSubtext}>Let us make you better</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => Alert.alert('Notifications', 'No new notifications at this time.')}
              >
                <Ionicons name="notifications-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => Alert.alert('SwiftCare', 'Version 1.0.0\nSmart Hospital Queue & Consultation\n\nGroup 60 — KNUST')}
              >
                <Ionicons name="help-circle-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Queue Card */}
          {queueStatus && (
            <TouchableOpacity
              style={styles.activeQueueCard}
              onPress={() => router.push('/(patient)/queue')}
            >
              <View style={styles.activeQueueLeft}>
                <View style={styles.activeQueueIcon}>
                  <Ionicons name="list-outline" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.activeQueueTitle}>{queueStatus.departmentName}</Text>
                  <Text style={styles.activeQueueSub}>
                    Current Queue {queueStatus.currentPosition}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}

          {/* Queue Number */}
          {queueStatus && (
            <View style={styles.queueNumberCard}>
              <Text style={styles.queueNumberLabel}>Queue {queueStatus.currentPosition}</Text>
              <Text style={styles.queueNumberSub}>
                Your turn at {queueStatus.estimatedCallTime
                  ? new Date(queueStatus.estimatedCallTime).toLocaleTimeString('en-GB', {
                      hour: '2-digit', minute: '2-digit'
                    })
                  : '--:--'}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={Colors.textDisabled} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clinics and departments"
              placeholderTextColor={Colors.textDisabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textDisabled} />
              </TouchableOpacity>
            )}
          </View>

          {/* Upcoming Consultation Banner */}
          {upcomingConsultation && (
            <TouchableOpacity
              style={styles.upcomingBanner}
              onPress={() => router.push('/(patient)/consultation')}
            >
              <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
              <Text style={styles.upcomingText}>Upcoming consultation with Dr. {upcomingConsultation.doctorName}</Text>
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>Soon</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickAction}
                onPress={() => {lightTap(); router.push(action.route as any); }}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name={action.icon as any} size={24} color={Colors.primary} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hospital Clinics */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hospital Clinics</Text>
          </View>

          {filteredDepartments.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No clinics match "{searchQuery}"</Text>
            </View>
          ) : (
            <View style={styles.clinicsGrid}>
              {filteredDepartments.map((dept) => (
                <TouchableOpacity
                  key={dept.id}
                  style={styles.clinicCard}
                  onPress={() => {lightTap(); router.push({
                    pathname: '/(patient)/appointments',
                    params: { preSelectedDept: dept.id },
                  }); }}
                >
                  <View style={styles.clinicIcon}>
                    <Ionicons name="business-outline" size={26} color={Colors.primary} />
                  </View>
                  <Text style={styles.clinicName} numberOfLines={2}>{dept.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Premium Upgrade */}
          {patient?.tier === 'FREE' && (
            <TouchableOpacity
              style={styles.upgradeCard}
              onPress={() => router.push('/(patient)/profile')}
            >
              <LinearGradient
                colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
                style={styles.upgradeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.upgradeContent}>
                  <Ionicons name="star-outline" size={24} color={Colors.white} />
                  <View style={styles.upgradeText}>
                    <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                    <Text style={styles.upgradeSubtext}>Get priority queue & live consultations</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.white },
  greetingSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  activeQueueCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  activeQueueLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeQueueIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  activeQueueTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  activeQueueSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  queueNumberCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 16 },
  queueNumberLabel: { fontSize: 20, fontWeight: '700', color: Colors.white },
  queueNumberSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, padding: 0 },
  upcomingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 },
  upcomingText: { flex: 1, fontSize: 13, color: Colors.primary, fontWeight: '500' },
  upcomingBadge: { backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  upcomingBadgeText: { fontSize: 11, color: Colors.white, fontWeight: '600' },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 28 },
  quickAction: { alignItems: 'center', width: (width - 40) / 3 },
  quickActionIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', lineHeight: 16 },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  noResults: { paddingVertical: 20, alignItems: 'center' },
  noResultsText: { fontSize: 13, color: Colors.textDisabled },
  clinicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  clinicCard: { alignItems: 'center', width: (width - 40 - 36) / 4 },
  clinicIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  clinicName: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', lineHeight: 14 },
  upgradeCard: { borderRadius: 16, overflow: 'hidden' },
  upgradeGradient: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upgradeContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeText: {},
  upgradeTitle: { fontSize: 15, fontWeight: '700', color: Colors.white },
  upgradeSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});