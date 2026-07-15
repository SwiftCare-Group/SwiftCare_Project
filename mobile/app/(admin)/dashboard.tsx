import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const [deptRes, aptRes] = await Promise.all([
        api.get('/departments'),
        api.get('/appointments').catch(() => ({ data: [] })),
      ]);
      const departments = deptRes.data;
      const appointments = aptRes.data;
      setStats({
        totalDepartments: departments.length,
        activeDepartments: departments.filter((d: any) => d.isActive).length,
        pendingAppointments: appointments.filter((a: any) => a.status === 'PENDING').length,
        completedAppointments: appointments.filter((a: any) => a.status === 'COMPLETED').length,
      });
    } catch (error) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('accessToken');
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const STAT_CARDS = [
    { label: 'Departments', value: stats?.totalDepartments, icon: 'business-outline', bg: Colors.primaryLight, color: Colors.primary },
    { label: 'Active', value: stats?.activeDepartments, icon: 'checkmark-circle-outline', bg: Colors.successLight, color: Colors.success },
    { label: 'In Queue', value: stats?.pendingAppointments, icon: 'time-outline', bg: Colors.warningLight, color: Colors.warning },
    { label: 'Completed', value: stats?.completedAppointments, icon: 'checkmark-done-outline', bg: Colors.infoLight, color: Colors.info },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>SwiftCare Hospital System</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((card, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: card.bg }]}>
              <Ionicons name={card.icon as any} size={24} color={card.color} />
              <Text style={[styles.statNumber, { color: card.color }]}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {[
          { icon: 'business-outline', label: 'Manage Departments', sub: 'Create and configure departments', route: '/(admin)/departments' },
          { icon: 'people-outline', label: 'Manage Staff', sub: 'Add doctors and pharmacists', route: '/(admin)/staff' },
        ].map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={() => router.push(action.route as any)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon as any} size={22} color={Colors.primary} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionSub}>{action.sub}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={Colors.textDisabled} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, alignItems: 'flex-start', gap: 8 },
  statNumber: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 13, color: Colors.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  actionCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  actionIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  actionInfo: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  actionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});