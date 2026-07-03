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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Patient Queue</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll}>
        {departments.map(dept => (
          <TouchableOpacity
            key={dept.id}
            style={[
              styles.deptTab,
              selectedDept === dept.id && styles.deptTabActive,
            ]}
            onPress={() => handleSelectDept(dept.id)}
          >
            <Text style={[
              styles.deptTabText,
              selectedDept === dept.id && styles.deptTabTextActive,
            ]}>
              {dept.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.queueHeader}>
        <Text style={styles.queueCount}>{queue.length} patients in queue</Text>
        <Text style={styles.queueHint}>Pull down to refresh</Text>
      </View>

      {queue.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>Queue is empty</Text>
          <Text style={styles.emptySubtext}>No pending patients in this department</Text>
        </View>
      ) : (
        queue.map((apt, index) => (
          <View
            key={apt.id}
            style={[
              styles.patientCard,
              apt.isEmergency && styles.emergencyCard,
            ]}
          >
            {apt.isEmergency && (
              <View style={styles.emergencyBanner}>
                <Text style={styles.emergencyText}>🚨 EMERGENCY</Text>
              </View>
            )}
            <View style={styles.cardHeader}>
              <View style={styles.positionBadge}>
                <Text style={styles.positionText}>#{index + 1}</Text>
              </View>
              <View style={[
                styles.severityBadge,
                { backgroundColor: (SEVERITY_COLORS[apt.severityLabel] || Colors.primary) + '20' }
              ]}>
                <Text style={[
                  styles.severityText,
                  { color: SEVERITY_COLORS[apt.severityLabel] || Colors.primary }
                ]}>
                  Score: {apt.severityScore}/10
                </Text>
              </View>
            </View>

            <Text style={styles.patientId}>Patient ID: {apt.patientId}</Text>
            <Text style={styles.scheduledTime}>
              Scheduled: {new Date(apt.scheduledTime).toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit'
              })}
            </Text>
            <Text style={styles.queuePosition}>Queue Position: {apt.queuePosition}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary },
  logoutText: { color: Colors.danger, fontSize: 14, fontWeight: '600' },
  deptScroll: { marginBottom: 20 },
  deptTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  deptTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  deptTabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  deptTabTextActive: { color: Colors.white, fontWeight: '700' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  queueCount: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  queueHint: { fontSize: 12, color: Colors.textDisabled },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled },
  patientCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  emergencyCard: { borderColor: Colors.danger, borderWidth: 2 },
  emergencyBanner: { backgroundColor: Colors.severityCriticalBg, borderRadius: 8, padding: 8, marginBottom: 12, alignItems: 'center' },
  emergencyText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  positionBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  positionText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  severityText: { fontSize: 12, fontWeight: '600' },
  patientId: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  scheduledTime: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  queuePosition: { fontSize: 13, color: Colors.textDisabled },
});