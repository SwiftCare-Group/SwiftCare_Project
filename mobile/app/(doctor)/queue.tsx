import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

const SEVERITY_COLORS: Record<string, string> = {
  MILD: Colors.severityMild,
  MODERATE: Colors.severityModerate,
  SEVERE: Colors.severitySevere,
  CRITICAL: Colors.severityCriticalBg,
};

export default function DoctorQueueScreen() {
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
      if (response.data.length > 0) {
        setSelectedDept(response.data[0].id);
        await fetchQueue(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = async (deptId: string) => {
    try {
      const response = await api.get(`/departments/${deptId}/queue`);
      setQueue(response.data);
    } catch (error) {
      console.error('Failed to fetch queue');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    const interval = setInterval(() => {
      if (selectedDept) fetchQueue(selectedDept);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedDept) fetchQueue(selectedDept);
  }, [selectedDept]);

  const handleSelectDept = async (deptId: string) => {
    setSelectedDept(deptId);
    setLoading(true);
    await fetchQueue(deptId);
    setLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('accessToken');
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Patient Queue</Text>
            <Text style={styles.headerSubtitle}>Ordered by medical urgency</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Department Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll}>
          {departments.map(dept => (
            <TouchableOpacity
              key={dept.id}
              style={[styles.deptTab, selectedDept === dept.id && styles.deptTabActive]}
              onPress={() => handleSelectDept(dept.id)}
            >
              <Text style={[styles.deptTabText, selectedDept === dept.id && styles.deptTabTextActive]}>
                {dept.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.queueHeader}>
          <Text style={styles.queueCount}>{queue.length} patients waiting</Text>
          <Text style={styles.queueHint}>Pull to refresh</Text>
        </View>

        {queue.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={40} color={Colors.success} />
            </View>
            <Text style={styles.emptyText}>Queue is clear</Text>
            <Text style={styles.emptySubtext}>No pending patients in this department</Text>
          </View>
        ) : (
          queue.map((apt, index) => (
            <View
              key={apt.id}
              style={[styles.patientCard, apt.isEmergency && styles.emergencyCard]}
            >
              {apt.isEmergency && (
                <View style={styles.emergencyBanner}>
                  <Ionicons name="warning-outline" size={14} color={Colors.white} />
                  <Text style={styles.emergencyText}>EMERGENCY</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>#{index + 1}</Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientIdText}>Patient</Text>
                  <Text style={styles.patientId} numberOfLines={1}>
                    {apt.patientId.slice(0, 12)}...
                  </Text>
                </View>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: (SEVERITY_COLORS[apt.severityLabel] || Colors.primary) + '20' }
                ]}>
                  <Text style={[
                    styles.severityText,
                    { color: SEVERITY_COLORS[apt.severityLabel] || Colors.primary }
                  ]}>
                    {apt.severityScore}/10
                  </Text>
                </View>
              </View>

              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.textDisabled} />
                  <Text style={styles.metaText}>
                    {new Date(apt.scheduledTime).toLocaleTimeString('en-GB', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="list-outline" size={13} color={Colors.textDisabled} />
                  <Text style={styles.metaText}>Queue #{apt.queuePosition}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  deptScroll: { marginBottom: 4 },
  deptTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', marginRight: 8 },
  deptTabActive: { backgroundColor: Colors.white },
  deptTabText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  deptTabTextActive: { color: Colors.primary, fontWeight: '700' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  queueCount: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  queueHint: { fontSize: 12, color: Colors.textDisabled },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.successLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled },
  patientCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  emergencyCard: { borderColor: Colors.danger, borderWidth: 2 },
  emergencyBanner: { backgroundColor: Colors.severityCriticalBg, borderRadius: 8, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  emergencyText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  positionBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  positionText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  patientInfo: { flex: 1 },
  patientIdText: { fontSize: 11, color: Colors.textDisabled, textTransform: 'uppercase', letterSpacing: 0.5 },
  patientId: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  severityText: { fontSize: 12, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textDisabled },
});