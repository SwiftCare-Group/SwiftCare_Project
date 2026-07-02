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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function HomeScreen() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [upcomingConsultation, setUpcomingConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [patientRes, appointmentsRes, consultationsRes] = await Promise.all([
        api.get('/patients/me'),
        api.get('/appointments'),
        api.get('/consultations').catch(() => ({ data: [] })),
      ]);

      setPatient(patientRes.data);

      const pendingApt = appointmentsRes.data.find(
        (a: any) => a.status === 'PENDING'
      );

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

      const upcoming = consultationsRes.data.find(
        (c: any) => c.status === 'SCHEDULED'
      );
      setUpcomingConsultation(upcoming || null);
    } catch (error) {
      console.error('Failed to fetch home data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {patient?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>How are you feeling today?</Text>
        </View>
        <View style={[
          styles.tierBadge,
          { backgroundColor: patient?.tier === 'PREMIUM' ? Colors.tierPremiumBg : Colors.tierFreeBg }
        ]}>
          <Text style={[
            styles.tierText,
            { color: patient?.tier === 'PREMIUM' ? Colors.tierPremium : Colors.tierFree }
          ]}>
            {patient?.tier}
          </Text>
        </View>
      </View>

      {/* Queue Status */}
      {queueStatus ? (
        <View style={styles.queueCard}>
          <View style={styles.queueCardHeader}>
            <Text style={styles.queueCardTitle}>You're in Queue</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.queueDept}>{queueStatus.departmentName}</Text>
          <Text style={styles.queuePosition}>{queueStatus.currentPosition}</Text>
          <Text style={styles.queuePositionLabel}>Position in Queue</Text>
          {queueStatus.currentPosition <= 2 && (
            <Text style={styles.queueAlert}>
              {queueStatus.currentPosition === 1
                ? '🎉 You are next! Head to the hospital now.'
                : '⏰ Almost your turn — start heading to the hospital.'}
            </Text>
          )}
          <TouchableOpacity
            style={styles.viewQueueButton}
            onPress={() => router.push('/(patient)/queue')}
          >
            <Text style={styles.viewQueueButtonText}>View Queue Details</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noQueueCard}>
          <Text style={styles.noQueueText}>You are not in any queue</Text>
          <TouchableOpacity
            style={styles.bookAptButton}
            onPress={() => router.push('/(patient)/appointments')}
          >
            <Text style={styles.bookAptButtonText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upcoming Consultation */}
      {upcomingConsultation && (
        <View style={styles.consultationCard}>
          <Text style={styles.cardSectionTitle}>Upcoming Consultation</Text>
          <Text style={styles.consultationDoctor}>Dr. {upcomingConsultation.doctorName}</Text>
          <Text style={styles.consultationTime}>
            {new Date(upcomingConsultation.scheduledAt).toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short',
              hour: '2-digit', minute: '2-digit'
            })}
          </Text>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => router.push('/(patient)/consultation')}
          >
            <Text style={styles.joinButtonText}>Go to Consultation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(patient)/symptoms')}
        >
          <Text style={styles.actionIcon}>🩺</Text>
          <Text style={styles.actionLabel}>Check Symptoms</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(patient)/appointments')}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionLabel}>Appointments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(patient)/consultation')}
        >
          <Text style={styles.actionIcon}>👨‍⚕️</Text>
          <Text style={styles.actionLabel}>Consult Doctor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(patient)/prescription')}
        >
          <Text style={styles.actionIcon}>💊</Text>
          <Text style={styles.actionLabel}>Prescriptions</Text>
        </TouchableOpacity>
      </View>

      {/* Premium Upgrade Prompt */}
      {patient?.tier === 'FREE' && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
          <Text style={styles.upgradeText}>
            Get priority queue placement, live doctor consultations, and digital prescriptions.
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/(patient)/profile')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
  subGreeting: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tierText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  queueCard: { backgroundColor: Colors.primary, borderRadius: 16, padding: 20, marginBottom: 16 },
  queueCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  queueCardTitle: { fontSize: 14, color: Colors.white, opacity: 0.8 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  liveText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  queueDept: { fontSize: 13, color: Colors.white, opacity: 0.7, marginBottom: 8 },
  queuePosition: { fontSize: 64, fontWeight: '800', color: Colors.white, lineHeight: 72 },
  queuePositionLabel: { fontSize: 13, color: Colors.white, opacity: 0.7, marginBottom: 8 },
  queueAlert: { fontSize: 13, color: Colors.white, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, marginBottom: 12, textAlign: 'center' },
  viewQueueButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  viewQueueButtonText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  noQueueCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  noQueueText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 14 },
  bookAptButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
  bookAptButtonText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  consultationCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardSectionTitle: { fontSize: 12, color: Colors.textDisabled, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  consultationDoctor: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  consultationTime: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  joinButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  joinButtonText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  quickActionsTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, alignItems: 'center', width: '47%', borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  upgradeCard: { backgroundColor: Colors.primaryLight, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.primary + '40' },
  upgradeTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  upgradeText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 14 },
  upgradeButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  upgradeButtonText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});