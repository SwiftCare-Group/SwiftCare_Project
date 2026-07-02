import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function ConsultationScreen() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [showSession, setShowSession] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [doctorsRes, consultationsRes] = await Promise.all([
        api.get('/consultations/doctors'),
        api.get('/consultations'),
      ]);
      setDoctors(doctorsRes.data);
      setConsultations(consultationsRes.data);
    } catch (error) {
      console.error('Failed to fetch consultation data');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedDoctor) {
      Alert.alert('Error', 'Please select a doctor');
      return;
    }

    setBooking(true);
    try {
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 1);

      await api.post('/consultations', {
        doctorId: selectedDoctor,
        scheduledAt: scheduledAt.toISOString().slice(0, 19),
      });

      Alert.alert('Success', 'Consultation booked successfully');
      setShowBooking(false);
      setSelectedDoctor(null);
      fetchData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to book consultation';
      if (message.includes('Premium')) {
        Alert.alert(
          'Premium Required',
          'Online consultations are available for Premium subscribers only. Upgrade to access this feature.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setBooking(false);
    }
  };

  const handleJoin = async (consultationId: string) => {
    try {
      const response = await api.put(`/consultations/${consultationId}/join`);
      setSessionUrl(response.data.sessionUrl);
      setShowSession(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to join session');
    }
  };

  const handleLeaveSession = () => {
    setShowSession(false);
    setSessionUrl(null);
    fetchData();
  };

  const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: Colors.warning,
    IN_PROGRESS: Colors.primary,
    COMPLETED: Colors.success,
    CANCELLED: Colors.danger,
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Consultations</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowBooking(!showBooking)}
          >
            <Text style={styles.addButtonText}>{showBooking ? 'Cancel' : '+ Book'}</Text>
          </TouchableOpacity>
        </View>

        {showBooking && (
          <View style={styles.bookingCard}>
            <Text style={styles.sectionTitle}>Book Online Consultation</Text>
            <Text style={styles.premiumNote}>
              🔒 Premium feature — available to Premium subscribers only
            </Text>
            <Text style={styles.label}>Select a Doctor</Text>
            {doctors.length === 0 ? (
              <Text style={styles.noDoctors}>No doctors available right now</Text>
            ) : (
              doctors.map(doctor => (
                <TouchableOpacity
                  key={doctor.id}
                  style={[
                    styles.doctorOption,
                    selectedDoctor === doctor.id && styles.doctorOptionSelected,
                  ]}
                  onPress={() => setSelectedDoctor(doctor.id)}
                >
                  <View>
                    <Text style={[
                      styles.doctorName,
                      selectedDoctor === doctor.id && styles.doctorNameSelected,
                    ]}>
                      Dr. {doctor.name}
                    </Text>
                    <Text style={styles.doctorDept}>{doctor.departmentName}</Text>
                  </View>
                  <View style={styles.availableBadge}>
                    <Text style={styles.availableText}>Available</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

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

        <Text style={styles.sectionTitle}>Your Consultations</Text>

        {consultations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👨‍⚕️</Text>
            <Text style={styles.emptyText}>No consultations yet</Text>
            <Text style={styles.emptySubtext}>Book your first online consultation above</Text>
          </View>
        ) : (
          consultations.map(con => (
            <View key={con.id} style={styles.consultationCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.doctorCardName}>Dr. {con.doctorName}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLORS[con.status] + '20' }
                ]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[con.status] }]}>
                    {con.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.scheduledTime}>
                {new Date(con.scheduledAt).toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit'
                })}
              </Text>

              {con.notes ? (
                <Text style={styles.notes}>Notes: {con.notes}</Text>
              ) : null}

              {(con.status === 'SCHEDULED' || con.status === 'IN_PROGRESS') && (
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoin(con.id)}
                >
                  <Text style={styles.joinButtonText}>
                    {con.status === 'IN_PROGRESS' ? 'Rejoin Session' : 'Join Session'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Video Session Modal */}
      <Modal visible={showSession} animationType="slide" onRequestClose={handleLeaveSession}>
        <View style={styles.sessionContainer}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>Live Consultation</Text>
            <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveSession}>
              <Text style={styles.leaveButtonText}>Leave</Text>
            </TouchableOpacity>
          </View>
          {sessionUrl && (
            <WebView
              source={{ uri: sessionUrl }}
              style={styles.webview}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary },
  addButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  bookingCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  premiumNote: { fontSize: 13, color: Colors.primary, backgroundColor: Colors.primaryLight, padding: 10, borderRadius: 8, marginBottom: 14 },
  label: { fontSize: 14, color: Colors.textSecondary, marginBottom: 10 },
  noDoctors: { fontSize: 14, color: Colors.textDisabled, textAlign: 'center', paddingVertical: 20 },
  doctorOption: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  doctorOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  doctorName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  doctorNameSelected: { color: Colors.primary },
  doctorDept: { fontSize: 12, color: Colors.textDisabled, marginTop: 2 },
  availableBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  availableText: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  bookButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  bookButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled },
  consultationCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  doctorCardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  scheduledTime: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  notes: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: 8 },
  joinButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  joinButtonText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  sessionContainer: { flex: 1, backgroundColor: Colors.black },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.textPrimary },
  sessionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  leaveButton: { backgroundColor: Colors.danger, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  leaveButtonText: { color: Colors.white, fontWeight: '700' },
  webview: { flex: 1 },
});