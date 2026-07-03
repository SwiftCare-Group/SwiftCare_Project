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
} from 'react-native';
import { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

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

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    try {
      const response = await api.get('/consultations');
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
    } catch (error) {
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
      const drugList = drugs.split(',').map(d => d.trim()).filter(d => d.length > 0);

      await api.put(`/consultations/${activeConsultation.id}/complete`, { notes });
      await api.post('/prescriptions', {
        consultationId: activeConsultation.id,
        drugs: drugList,
      });

      Alert.alert('Success', 'Prescription issued successfully');
      setShowPrescription(false);
      setDrugs('');
      setNotes('');
      setActiveConsultation(null);
      fetchConsultations();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to issue prescription');
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Consultations</Text>
        <Text style={styles.subtitle}>Scheduled and ongoing sessions</Text>

        {consultations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No upcoming consultations</Text>
            <Text style={styles.emptySubtext}>Patients will appear here when they book a session</Text>
          </View>
        ) : (
          consultations.map(con => (
            <View key={con.id} style={styles.consultationCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.patientLabel}>Patient</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLORS[con.status] + '20' }
                ]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[con.status] }]}>
                    {con.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.patientId}>ID: {con.patientId}</Text>
              <Text style={styles.scheduledTime}>
                {new Date(con.scheduledAt).toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit'
                })}
              </Text>

              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => handleJoin(con)}
              >
                <Text style={styles.joinButtonText}>
                  {con.status === 'IN_PROGRESS' ? 'Rejoin Session' : 'Start Session'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Video Session Modal */}
      <Modal visible={showSession} animationType="slide" onRequestClose={handleEndSession}>
        <View style={styles.sessionContainer}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>Live Session</Text>
            <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
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
        <ScrollView style={styles.prescriptionModal} contentContainerStyle={styles.prescriptionContent}>
          <Text style={styles.prescriptionTitle}>Issue Prescription</Text>
          <Text style={styles.prescriptionSubtitle}>
            Enter the drugs to prescribe. Separate multiple drugs with commas.
          </Text>

          <Text style={styles.fieldLabel}>Drugs</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Paracetamol 500mg, Amoxicillin 250mg, Vitamin C"
            placeholderTextColor={Colors.textDisabled}
            value={drugs}
            onChangeText={setDrugs}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.fieldLabel}>Consultation Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add clinical notes for this consultation..."
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
              <Text style={styles.issueButtonText}>Issue Prescription</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              setShowPrescription(false);
              fetchConsultations();
            }}
          >
            <Text style={styles.skipButtonText}>Complete Without Prescription</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled, textAlign: 'center', paddingHorizontal: 20 },
  consultationCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  patientLabel: { fontSize: 12, color: Colors.textDisabled, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  patientId: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  scheduledTime: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  joinButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  joinButtonText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  sessionContainer: { flex: 1, backgroundColor: Colors.black },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.textPrimary },
  sessionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  endButton: { backgroundColor: Colors.danger, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  endButtonText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  webview: { flex: 1 },
  prescriptionModal: { flex: 1, backgroundColor: Colors.background },
  prescriptionContent: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  prescriptionTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
  prescriptionSubtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  textArea: { height: 110 },
  issueButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  issueButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  skipButton: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  skipButtonText: { color: Colors.textSecondary, fontSize: 14 },
});