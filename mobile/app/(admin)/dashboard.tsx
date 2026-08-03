import { useTheme, type AppColors } from '../../context/ThemeContext';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { logoutSession } from '../../services/api';
import { Colors } from '../../constants/colors';
import SwiftCareLogo from '../../components/branding/SwiftCareLogo';
import { getApiErrorMessage } from '../../utils/errors';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';

export default function AdminDashboard() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoadError(null);
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error: unknown) {
      setLoadError(
        getApiErrorMessage(error, {
          fallback: 'Dashboard statistics could not be loaded.',
        })
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useRefreshOnFocus(fetchStats);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const handleLogout = async () => {
    await logoutSession();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const STAT_CARDS = [
    { label: 'Departments', value: stats?.totalDepartments, icon: 'business-outline', bg: colors.primaryLight, color: colors.primary },
    { label: 'Active', value: stats?.activeDepartments, icon: 'checkmark-circle-outline', bg: colors.successLight, color: colors.success },
    { label: 'In Queue', value: stats?.pendingAppointments, icon: 'time-outline', bg: colors.warningLight, color: colors.warning },
    { label: 'Completed', value: stats?.completedAppointments, icon: 'checkmark-done-outline', bg: colors.infoLight, color: colors.info },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIdentity}>
            <SwiftCareLogo size={46} compact />
            <View>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>SwiftCare Hospital System</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loadError ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={() => void fetchStats()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
              <Ionicons name={action.icon as any} size={22} color={colors.primary} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionSub}>{action.sub}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.headerGradientStart },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, alignItems: 'flex-start', gap: 8 },
  statNumber: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 13, color: colors.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  actionCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  actionIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  actionInfo: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  actionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger, borderRadius: 14, padding: 14, marginBottom: 18 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textPrimary },
  retryText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
