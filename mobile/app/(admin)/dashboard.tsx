import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
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
        totalAppointments: appointments.length,
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

  useEffect(() => {
    fetchStats();
  }, []);

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>SwiftCare Hospital System</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: Colors.primaryLight }]}>
          <Text style={styles.statNumber}>{stats?.totalDepartments}</Text>
          <Text style={styles.statLabel}>Departments</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.successLight }]}>
          <Text style={styles.statNumber}>{stats?.activeDepartments}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.warningLight }]}>
          <Text style={styles.statNumber}>{stats?.pendingAppointments}</Text>
          <Text style={styles.statLabel}>In Queue</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.infoLight }]}>
          <Text style={styles.statNumber}>{stats?.completedAppointments}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(admin)/departments')}
        >
          <Text style={styles.actionIcon}>🏥</Text>
          <Text style={styles.actionLabel}>Manage Departments</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(admin)/staff')}
        >
          <Text style={styles.actionIcon}>👨‍⚕️</Text>
          <Text style={styles.actionLabel}>Manage Staff</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  logoutText: { color: Colors.danger, fontSize: 14, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: { width: '47%', borderRadius: 14, padding: 18, alignItems: 'center' },
  statNumber: { fontSize: 36, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  actions: { gap: 10 },
  actionCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 24, marginRight: 14 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  actionArrow: { fontSize: 20, color: Colors.textDisabled },
});