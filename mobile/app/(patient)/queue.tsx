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
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';


export default function QueueScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [queueStatuses, setQueueStatuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { lightTap, warningNotification } = useHaptics();

  const fetchData = async () => {
    try {
      const response = await api.get('/appointments');
      const pending = response.data.filter((a: any) => a.status === 'PENDING');
      setAppointments(pending);

      const statuses: Record<string, any> = {};
      await Promise.all(
        pending.map(async (apt: any) => {
          try {
            const queueRes = await api.get(`/appointments/${apt.id}/queue`);
            statuses[apt.id] = queueRes.data;
          } catch {
            statuses[apt.id] = null;
          }
        })
      );
      setQueueStatuses(statuses);
    } catch (error) {
      console.error('Failed to fetch queue data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleCancel = async (appointmentId: string) => {
    Alert.alert('Leave Queue', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          warningNotification();
          try {
            await api.put(`/appointments/${appointmentId}/cancel`);
            fetchData();
          } catch {
            Alert.alert('Error', 'Failed to cancel appointment');
          }
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
        <Text style={styles.headerTitle}>Queue Details</Text>
        <Text style={styles.headerSubtitle}>Pull down to refresh your position</Text>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="list-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyText}>You are not in any queue</Text>
            <Text style={styles.emptySubtext}>Book an appointment to join a queue</Text>
          </View>
        ) : (
          appointments.map(apt => {
            const queue = queueStatuses[apt.id];
            return (
              <View key={apt.id} style={styles.queueCard}>
                {/* Clinic Info */}
                <View style={styles.clinicRow}>
                  <View style={styles.clinicIconBox}>
                    <Ionicons name="business-outline" size={20} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.clinicName}>{apt.departmentName}</Text>
                    <Text style={styles.registrationTime}>
                      Registration time {new Date(apt.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>

                {/* Queue Number */}
                <View style={styles.queueNumberSection}>
                  <Text style={styles.queueLabel}>Queue {queue?.currentPosition ?? '—'}</Text>
                  <Text style={styles.queueSub}>
                    Current Queue {queue?.currentPosition ?? '—'} of 17
                  </Text>
                </View>

                {/* Estimated Time */}
                <LinearGradient
                  colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
                  style={styles.timeCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="time-outline" size={18} color={Colors.white} />
                  <Text style={styles.timeLabel}>Your Turn at:</Text>
                  <Text style={styles.timeValue}>
                    {queue?.estimatedCallTime
                      ? new Date(queue.estimatedCallTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                      : '--:--'}
                  </Text>
                </LinearGradient>

                {/* Emergency Banner */}
                {queue?.isEmergency && (
                  <View style={styles.emergencyBanner}>
                    <Ionicons name="warning-outline" size={16} color={Colors.white} />
                    <Text style={styles.emergencyText}>🚨 EMERGENCY — Priority Queue</Text>
                  </View>
                )}

                {/* Alert messages */}
                {queue?.currentPosition === 1 && (
                  <View style={styles.alertBanner}>
                    <Text style={styles.alertText}>🎉 You are next! Please proceed to the hospital.</Text>
                  </View>
                )}
                {queue?.currentPosition === 2 && (
                  <View style={[styles.alertBanner, { backgroundColor: Colors.warningLight }]}>
                    <Text style={[styles.alertText, { color: Colors.warning }]}>⏰ Almost your turn — head to the hospital soon.</Text>
                  </View>
                )}

                {/* QR Code hint */}
                <View style={styles.qrHintBox}>
                  <Ionicons name="qr-code-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.qrHintText}>
                    Scan this QR code at the clinic administration when your name is called and your queue number appears.
                  </Text>
                </View>

                {/* Meta */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Patient Name</Text>
                    <Text style={styles.metaValue}>You</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Queue Number</Text>
                    <Text style={styles.metaValue}>{queue?.currentPosition ?? '—'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Reservation Date</Text>
                    <Text style={styles.metaValue}>
                      {new Date(apt.scheduledTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </Text>
                  </View>
                </View>

                {/* Leave Queue */}
                <TouchableOpacity
                  style={styles.leaveButton}
                  onPress={() => handleCancel(apt.id)}
                >
                  <Text style={styles.leaveButtonText}>Leave Queue</Text>
                </TouchableOpacity>
              </View>
            );
          })
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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled },
  queueCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  clinicRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  clinicIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  clinicName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  registrationTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  queueNumberSection: { marginBottom: 14 },
  queueLabel: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  queueSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  timeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginBottom: 14 },
  timeLabel: { flex: 1, fontSize: 14, color: Colors.white, fontWeight: '500' },
  timeValue: { fontSize: 16, fontWeight: '700', color: Colors.white },
  emergencyBanner: { backgroundColor: Colors.severityCriticalBg, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  emergencyText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  alertBanner: { backgroundColor: Colors.primaryLight, borderRadius: 10, padding: 10, marginBottom: 10 },
  alertText: { color: Colors.primary, fontSize: 13, fontWeight: '500', textAlign: 'center' },
  qrHintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.surfaceSecondary, borderRadius: 10, padding: 12, marginBottom: 14 },
  qrHintText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 14, marginBottom: 14 },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 11, color: Colors.textDisabled, marginBottom: 4 },
  metaValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  leaveButton: { borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  leaveButtonText: { color: Colors.danger, fontSize: 14, fontWeight: '600' },
});