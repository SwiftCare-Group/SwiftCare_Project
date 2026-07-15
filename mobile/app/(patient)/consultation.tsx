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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';


export default function ConsultationScreen() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [showSession, setShowSession] = useState(false);
  const { mediumTap, successNotification, errorNotification } = useHaptics();

  useEffect(() => { fetchData(); }, []);

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
    mediumTap();
    if (!selectedDoctor) {
      Alert.alert('Error', 'Please select a doctor');
      return;
    }
    setBooking(true);
    try {
      successNotification();
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
      errorNotification();
      const message = error.response?.data?.message || 'Failed to book consultation';
      if (message.includes('Premium') || error.response?.status === 401) {
        Alert.alert('Premium Required', 'Online consultations are available for Premium subscribers only. Upgrade in your profile to access this feature.');
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setBooking(false);
    }
  };

  const handleJoin = async (consultationId: string) => {
    mediumTap();
    try {
      const response = await api.put(`/consultations/${consultationId}/join`);
      setSessionUrl(response.data.sessionUrl);
      setShowSession(true);
    } catch {
      Alert.alert('Error', 'Failed to join session');
    }
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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient
          colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Consultations</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowBooking(!showBooking)}
            >
              <Ionicons name={showBooking ? 'close' : 'add'} size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Live video consultations with doctors</Text>
        </LinearGradient>

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

          {showBooking && (
            <View style={styles.bookingCard}>
              <View style={styles.premiumBadge}>
                <Ionicons name="star-outline" size={14} color={Colors.primary} />
                <Text style={styles.premiumBadgeText}>Premium Feature</Text>
              </View>
              <Text style={styles.bookingTitle}>Book a Doctor</Text>
              <Text style={styles.bookingSubtitle}>
                Select an available doctor for your online consultation
              </Text>

              {doctors.length === 0 ? (
                <View style={styles.noDoctors}>
                  <Ionicons name="person-outline" size={32} color={Colors.textDisabled} />
                  <Text style={styles.noDoctorsText}>No doctors available right now</Text>
                </View>
              ) : (
                doctors.map(doctor => (
                  <TouchableOpacity
                    key={doctor.id}
                    style={[
                      styles.doctorCard,
                      selectedDoctor === doctor.id && styles.doctorCardSelected,
                    ]}
                    onPress={() => setSelectedDoctor(doctor.id)}
                  >
                    <View style={styles.doctorAvatar}>
                      <Ionicons name="person-outline" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.doctorInfo}>
                      <Text style={[
                        styles.doctorName,
                        selectedDoctor === doctor.id && styles.doctorNameSelected,
                      ]}>
                        Dr. {doctor.name}
                      </Text>
                      <Text style={styles.doctorDept}>{doctor.departmentName}</Text>
                    </View>
                    <View style={styles.availableDot} />
                  </TouchableOpacity>
                ))
              )}

              <TouchableOpacity
                style={[styles.confirmButton, booking && styles.buttonDisabled]}
                onPress={handleBook}
                disabled={booking}
              >
                <LinearGradient
                  colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
                  style={styles.confirmButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {booking ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="videocam-outline" size={18} color={Colors.white} />
                      <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Your Consultations</Text>

          {consultations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="videocam-outline" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.emptyText}>No consultations yet</Text>
              <Text style={styles.emptySubtext}>
                Book your first online consultation above
              </Text>
            </View>
          ) : (
            consultations.map(con => (
              <View key={con.id} style={styles.consultationCard}>
                <View style={styles.conHeader}>
                  <View style={styles.doctorAvatarSmall}>
                    <Ionicons name="person-outline" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.conInfo}>
                    <Text style={styles.conDoctorName}>Dr. {con.doctorName}</Text>
                    <Text style={styles.conTime}>
                      {new Date(con.scheduledAt).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[con.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[con.status] }]}>
                      {con.status}
                    </Text>
                  </View>
                </View>

                {con.notes ? (
                  <Text style={styles.conNotes}>{con.notes}</Text>
                ) : null}

                {(con.status === 'SCHEDULED' || con.status === 'IN_PROGRESS') && (
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => handleJoin(con.id)}
                  >
                    <LinearGradient
                      colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
                      style={styles.joinButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="videocam-outline" size={16} color={Colors.white} />
                      <Text style={styles.joinButtonText}>
                        {con.status === 'IN_PROGRESS' ? 'Rejoin Session' : 'Join Session'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showSession} animationType="slide" onRequestClose={() => setShowSession(false)}>
        <View style={styles.sessionContainer}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>Live Consultation</Text>
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={() => setShowSession(false)}
            >
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
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  bookingCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 12 },
  premiumBadgeText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  bookingTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  bookingSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  noDoctors: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noDoctorsText: { fontSize: 14, color: Colors.textDisabled },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  doctorCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  doctorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  doctorNameSelected: { color: Colors.primary },
  doctorDept: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  availableDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  confirmButton: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  confirmButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  confirmButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  buttonDisabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled, textAlign: 'center' },
  consultationCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  conHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  doctorAvatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  conInfo: { flex: 1 },
  conDoctorName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  conTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  conNotes: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: 12 },
  joinButton: { borderRadius: 12, overflow: 'hidden' },
  joinButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  joinButtonText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  sessionContainer: { flex: 1, backgroundColor: Colors.black },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.headerGradientStart },
  sessionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  leaveButton: { backgroundColor: Colors.danger, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  leaveButtonText: { color: Colors.white, fontWeight: '700' },
  webview: { flex: 1 },
});