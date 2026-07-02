import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function QueueScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [queueStatuses, setQueueStatuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      <Text style={styles.title}>Queue Tracker</Text>
      <Text style={styles.subtitle}>Pull down to refresh your position</Text>

      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏥</Text>
          <Text style={styles.emptyText}>You are not in any queue</Text>
          <Text style={styles.emptySubtext}>Book an appointment to join a queue</Text>
        </View>
      ) : (
        appointments.map(apt => {
          const queue = queueStatuses[apt.id];
          return (
            <View key={apt.id} style={styles.queueCard}>
              {queue?.isEmergency && (
                <View style={styles.emergencyBanner}>
                  <Text style={styles.emergencyText}>🚨 EMERGENCY — Priority Queue</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <Text style={styles.deptName}>{apt.departmentName}</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>

              <View style={styles.positionContainer}>
                <Text style={styles.positionNumber}>
                  {queue?.currentPosition ?? '—'}
                </Text>
                <Text style={styles.positionLabel}>Position in Queue</Text>
              </View>

              {queue?.currentPosition === 1 && (
                <View style={styles.nextBanner}>
                  <Text style={styles.nextText}>🎉 You are next! Please proceed to the hospital.</Text>
                </View>
              )}

              {queue?.currentPosition === 2 && (
                <View style={styles.soonBanner}>
                  <Text style={styles.soonText}>⏰ Almost your turn — head to the hospital soon.</Text>
                </View>
              )}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Estimated Call Time</Text>
                  <Text style={styles.metaValue}>
                    {queue?.estimatedCallTime
                      ? new Date(queue.estimatedCallTime).toLocaleTimeString('en-GB', {
                          hour: '2-digit', minute: '2-digit'
                        })
                      : '—'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Severity Score</Text>
                  <Text style={styles.metaValue}>{apt.severityScore}/10</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancel(apt.id)}
              >
                <Text style={styles.cancelButtonText}>Leave Queue</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textDisabled,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textDisabled,
  },
  queueCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emergencyBanner: {
    backgroundColor: Colors.severityCriticalBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  emergencyText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  deptName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  positionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  positionNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.primary,
    lineHeight: 80,
  },
  positionLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  nextBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  nextText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  soonBanner: {
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  soonText: {
    color: Colors.warning,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    marginBottom: 16,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textDisabled,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});