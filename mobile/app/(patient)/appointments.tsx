import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warning,
  ACTIVE: Colors.primary,
  COMPLETED: Colors.success,
  CANCELLED: Colors.danger,
};

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchDepartments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments');
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  };

  const handleBook = async () => {
    if (!selectedDept) {
      Alert.alert('Error', 'Please select a department');
      return;
    }

    setBooking(true);
    try {
      const scheduledTime = new Date();
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      scheduledTime.setHours(9, 0, 0, 0);

      await api.post('/appointments', {
        departmentId: selectedDept,
        scheduledTime: scheduledTime.toISOString().slice(0, 19),
        severityScore: 5,
      });

      Alert.alert('Success', 'Appointment booked successfully');
      setShowBooking(false);
      setSelectedDept(null);
      fetchAppointments();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/appointments/${appointmentId}/cancel`);
            fetchAppointments();
          } catch (error) {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowBooking(!showBooking)}
        >
          <Text style={styles.addButtonText}>{showBooking ? 'Cancel' : '+ Book'}</Text>
        </TouchableOpacity>
      </View>

      {showBooking && (
        <View style={styles.bookingCard}>
          <Text style={styles.sectionTitle}>Book Appointment</Text>
          <Text style={styles.label}>Select Department</Text>
          {departments.map(dept => (
            <TouchableOpacity
              key={dept.id}
              style={[
                styles.deptOption,
                selectedDept === dept.id && styles.deptOptionSelected,
              ]}
              onPress={() => setSelectedDept(dept.id)}
            >
              <Text style={[
                styles.deptOptionText,
                selectedDept === dept.id && styles.deptOptionTextSelected,
              ]}>
                {dept.name}
              </Text>
              <Text style={styles.deptHours}>{dept.operatingHours}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.bookButton, booking && styles.buttonDisabled]}
            onPress={handleBook}
            disabled={booking}
          >
            {booking ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.bookButtonText}>Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Your Appointments</Text>

      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No appointments yet</Text>
          <Text style={styles.emptySubtext}>Book your first appointment above</Text>
        </View>
      ) : (
        appointments.map(apt => (
          <View key={apt.id} style={styles.appointmentCard}>
            <View style={styles.aptHeader}>
              <Text style={styles.aptDept}>{apt.departmentName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[apt.status] + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[apt.status] }]}>
                  {apt.status}
                </Text>
              </View>
            </View>
            <Text style={styles.aptTime}>
              {new Date(apt.scheduledTime).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </Text>
            <View style={styles.aptMeta}>
              <Text style={styles.aptMetaText}>Queue Position: {apt.queuePosition}</Text>
              <Text style={styles.aptMetaText}>Severity Score: {apt.severityScore}</Text>
            </View>
            {apt.status === 'PENDING' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancel(apt.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  deptOption: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  deptOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  deptOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  deptOptionTextSelected: {
    color: Colors.primary,
  },
  deptHours: {
    fontSize: 12,
    color: Colors.textDisabled,
    marginTop: 2,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  bookButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textDisabled,
    marginTop: 4,
  },
  appointmentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aptDept: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aptTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  aptMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  aptMetaText: {
    fontSize: 12,
    color: Colors.textDisabled,
  },
  cancelButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});