import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';
import { showToast } from '../../utils/toast';


const { width } = Dimensions.get('window');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '11:00', '13:00', '13:30'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warning,
  ACTIVE: Colors.primary,
  COMPLETED: Colors.success,
  CANCELLED: Colors.danger,
};

export default function AppointmentsScreen() {
  const { preSelectedDept } = useLocalSearchParams<{ preSelectedDept: string }>();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [showBooking, setShowBooking] = useState(false);
  const [activeTab, setActiveTab] = useState<'hospital' | 'online'>('hospital');
  const { mediumTap, successNotification, errorNotification } = useHaptics();


  const getDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  useEffect(() => {
    fetchAppointments();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (preSelectedDept) {
      setSelectedDept(preSelectedDept);
      setShowBooking(true);
    }
  }, [preSelectedDept]);

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
    mediumTap();
    if (!selectedDept) {
      Alert.alert('Error', 'Please select a department');
      return;
    }

    setBooking(true);
    try {
      successNotification();
      const today = new Date();
      const scheduledTime = new Date(today);
      scheduledTime.setDate(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const savedScore = await AsyncStorage.getItem('lastSeverityScore');
      const severityScore = savedScore ? parseInt(savedScore) : 3;

      await api.post('/appointments', {
        departmentId: selectedDept,
        scheduledTime: scheduledTime.toISOString().slice(0, 19),
        severityScore,
      });

      showToast.success('Your appointment has been booked successfully');
      setShowBooking(false);
      setSelectedDept(null);
      fetchAppointments();
    } catch (error: any) {
      errorNotification();
      showToast.error(error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/appointments/${appointmentId}/cancel`);
            fetchAppointments();
          } catch {
            showToast.error('Failed to cancel appointment');
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

  const dates = getDates();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowBooking(!showBooking)}
          >
            <Ionicons name={showBooking ? 'close' : 'add'} size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {showBooking && (
          <View style={styles.bookingCard}>
            <View style={styles.tabToggle}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'hospital' && styles.tabButtonActive]}
                onPress={() => setActiveTab('hospital')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'hospital' && styles.tabButtonTextActive]}>
                  Hospital
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'online' && styles.tabButtonActive]}
                onPress={() => setActiveTab('online')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'online' && styles.tabButtonTextActive]}>
                  Online
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.bookingLabel}>Select Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll}>
              {departments.map(dept => (
                <TouchableOpacity
                  key={dept.id}
                  style={[styles.deptChip, selectedDept === dept.id && styles.deptChipActive]}
                  onPress={() => setSelectedDept(dept.id)}
                >
                  <Text style={[styles.deptChipText, selectedDept === dept.id && styles.deptChipTextActive]}>
                    {dept.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.dateHeader}>
              <Text style={styles.bookingLabel}>Available Date & Time</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {dates.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.dateCard, selectedDate === date.getDate() && styles.dateCardActive]}
                  onPress={() => setSelectedDate(date.getDate())}
                >
                  <Text style={[styles.dateDay, selectedDate === date.getDate() && styles.dateDayActive]}>
                    {date.getDate()}
                  </Text>
                  <Text style={[styles.dateWeekday, selectedDate === date.getDate() && styles.dateWeekdayActive]}>
                    {DAYS[date.getDay()]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.timeGrid}>
              {TIME_SLOTS.map(time => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeSlot, selectedTime === time && styles.timeSlotActive]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.symptomHint}>
              <Text style={styles.symptomHintLabel}>Your Symptom</Text>
              <Text style={styles.symptomHintText}>Submit symptoms first for accurate queue priority</Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, booking && styles.buttonDisabled]}
              onPress={handleBook}
              disabled={booking}
            >
              {booking ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Your Appointments</Text>

        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.emptyText}>No appointments yet</Text>
            <Text style={styles.emptySubtext}>Tap + to book your first appointment</Text>
          </View>
        ) : (
          appointments.map(apt => (
            <View key={apt.id} style={styles.appointmentCard}>
              <View style={styles.aptHeader}>
                <View style={styles.aptIconBox}>
                  <Ionicons name="business-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.aptInfo}>
                  <Text style={styles.aptDept}>{apt.departmentName}</Text>
                  <Text style={styles.aptTime}>
                    {new Date(apt.scheduledTime).toLocaleDateString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[apt.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[apt.status] }]}>
                    {apt.status}
                  </Text>
                </View>
              </View>

              <View style={styles.aptMeta}>
                <View style={styles.aptMetaItem}>
                  <Ionicons name="list-outline" size={14} color={Colors.textDisabled} />
                  <Text style={styles.aptMetaText}>Queue #{apt.queuePosition}</Text>
                </View>
                <View style={styles.aptMetaItem}>
                  <Ionicons name="analytics-outline" size={14} color={Colors.textDisabled} />
                  <Text style={styles.aptMetaText}>Severity {apt.severityScore}/10</Text>
                </View>
              </View>

              {apt.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancel(apt.id)}
                >
                  <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
                </TouchableOpacity>
              )}
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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  bookingCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  tabToggle: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 10, padding: 4, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabButtonActive: { backgroundColor: Colors.primary },
  tabButtonText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  tabButtonTextActive: { color: Colors.white, fontWeight: '700' },
  bookingLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10 },
  deptScroll: { marginBottom: 16 },
  deptChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.surface },
  deptChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  deptChipText: { fontSize: 13, color: Colors.textSecondary },
  deptChipTextActive: { color: Colors.white, fontWeight: '600' },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateScroll: { marginBottom: 14 },
  dateCard: { width: 48, height: 64, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: Colors.surface },
  dateCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateDay: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  dateDayActive: { color: Colors.white },
  dateWeekday: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  dateWeekdayActive: { color: 'rgba(255,255,255,0.8)' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  timeSlot: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  timeSlotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeSlotText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  timeSlotTextActive: { color: Colors.white, fontWeight: '700' },
  symptomHint: { backgroundColor: Colors.primaryLight, borderRadius: 10, padding: 12, marginBottom: 16 },
  symptomHintLabel: { fontSize: 13, fontWeight: '600', color: Colors.primary, marginBottom: 4 },
  symptomHintText: { fontSize: 12, color: Colors.textSecondary },
  confirmButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled },
  appointmentCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  aptHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  aptIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  aptInfo: { flex: 1 },
  aptDept: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  aptTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  aptMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  aptMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aptMetaText: { fontSize: 12, color: Colors.textDisabled },
  cancelButton: { borderWidth: 1, borderColor: Colors.danger, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelButtonText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
});