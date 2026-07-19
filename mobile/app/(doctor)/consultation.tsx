import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { showToast } from '../../utils/toast';


export default function DoctorConsultationScreen() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [showSession, setShowSession] = useState(false);
  const [activeConsultation, setActiveConsultation] = useState<any>(null);
  const [showPrescription, setShowPrescription] = useState(false);
  const [drugs, setDrugs] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchConsultations(); }, []);

  const fetchConsultations = async () => {
    try {
      const response = await api.get('/consultations/doctor');
      setConsultations(response.data.filter(
        (c: any) => c.status === 'SCHEDULED' || c.status === 'IN_PROGRESS'
      ));
    } catch (error) {
      console.error('Failed to fetch consultations');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (consultation: any) => {
    try {
      const response = await api.put(`/consultations/${consultation.id}/join`);
      setSessionUrl(response.data.sessionUrl);
      setActiveConsultation(response.data);
      setShowSession(true);
    } catch {
      Alert.alert('Error', 'Failed to join session');
    }
  };

  const handleEndSession = () => {
    setShowSession(false);
    setShowPrescription(true);
  };

  const handleIssuePrescription = async () => {
    if (!drugs.trim()) {
      Alert.alert('Error', 'Please enter at least one drug');
      return;
    }
    setSubmitting(true);
    try {
      const drugList = drugs.split(',').map((d: string) => d.trim()).filter((d: string) => d.length > 0);
      await api.put(`/consultations/${activeConsultation.id}/complete`, { notes });
      await api.post('/prescriptions', {
        consultationId: activeConsultation.id,
        drugs: drugList,
      });
      showToast.success('Prescription issued successfully');
      setShowPrescription(false);
      setDrugs('');
      setNotes('');
      setActiveConsultation(null);
      fetchConsultations();
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to issue prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: Colors.warning,
    IN_PROGRESS: Colors.primary,
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
          <Text style={styles.headerTitle}>My Consultations</Text>
          <Text style={styles.headerSubtitle}>Scheduled and ongoing sessions</Text>
        </LinearGradient>

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {consultations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="videocam-outline" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.emptyText}>No upcoming consultations</Text>
              <Text style={styles.emptySubtext}>Patients will appear here when they book</Text>
            </View>
          ) : (
            consultations.map(con => (
              <View key={con.id} style={styles.consultationCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.patientAvatar}>
                    <Ionicons name="person-outline" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.patientLabel}>Patient Consultation</Text>
                    <Text style={styles.scheduledTime}>
                      {new Date(con.scheduledAt).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[con.status] + '20' }
                  ]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[con.status] }]}>
                      {con.status}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoin(con)}
                >
                  <LinearGradient
                    colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
                    style={styles.joinButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="videocam-outline" size={16} color={Colors.white} />
                    <Text style={styles.joinButtonText}>
                      {con.status === 'IN_PROGRESS' ? 'Rejoin Session' : 'Start Session'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Video Session Modal */}
      <Modal visible={showSession} animationType="slide" onRequestClose={handleEndSession}>
        <View style={styles.sessionContainer}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>Live Session</Text>
            <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
              <Ionicons name="document-text-outline" size={16} color={Colors.white} />
              <Text style={styles.endButtonText}>End & Prescribe</Text>
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

      {/* Prescription Modal */}
      <Modal visible={showPrescription} animationType="slide" onRequestClose={() => setShowPrescription(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.headerGradientStart }} edges={['top']}>
          <LinearGradient
            colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
            style={styles.prescHeader}
          >
            <Text style={styles.prescHeaderTitle}>Issue Prescription</Text>
            <Text style={styles.prescHeaderSubtitle}>Enter drugs and consultation notes</Text>
          </LinearGradient>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView style={styles.prescContainer} contentContainerStyle={styles.prescContent}>
              <Text style={styles.fieldLabel}>Prescribed Drugs</Text>
              <Text style={styles.fieldHint}>Separate multiple drugs with commas</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Paracetamol 500mg, Amoxicillin 250mg"
                placeholderTextColor={Colors.textDisabled}
                value={drugs}
                onChangeText={setDrugs}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Consultation Notes</Text>
              <Text style={styles.fieldHint}>Optional clinical notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add clinical observations..."
                placeholderTextColor={Colors.textDisabled}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.issueButton, submitting && styles.buttonDisabled]}
                onPress={handleIssuePrescription}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={18} color={Colors.white} />
                    <Text style={styles.issueButtonText}>Issue Prescription</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => { setShowPrescription(false); fetchConsultations(); }}
              >
                <Text style={styles.skipButtonText}>Complete Without Prescription</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled, textAlign: 'center' },
  consultationCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  patientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  patientLabel: { fontSize: 12, color: Colors.textDisabled, textTransform: 'uppercase', letterSpacing: 0.5 },
  scheduledTime: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  joinButton: { borderRadius: 12, overflow: 'hidden' },
  joinButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  joinButtonText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  sessionContainer: { flex: 1, backgroundColor: Colors.black },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.headerGradientStart },
  sessionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  endButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.danger, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  endButtonText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  webview: { flex: 1 },
  prescHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  prescHeaderTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  prescHeaderSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  prescContainer: { flex: 1, backgroundColor: Colors.background },
  prescContent: { padding: 20, paddingBottom: 40 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4, marginTop: 16 },
  fieldHint: { fontSize: 12, color: Colors.textDisabled, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  textArea: { height: 110 },
  issueButton: { borderRadius: 14, overflow: 'hidden', marginTop: 24, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  issueButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  skipButton: { alignItems: 'center', marginTop: 16, paddingVertical: 12 },
  skipButtonText: { color: Colors.textSecondary, fontSize: 14 },
});