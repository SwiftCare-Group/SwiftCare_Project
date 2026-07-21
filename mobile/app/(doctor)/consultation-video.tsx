import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import api from '../../services/api';
import { Colors } from '../../constants/colors';

type ConsultationStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  queueEntryId: string | null;
  doctorName?: string;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  sessionUrl?: string | null;
  status: ConsultationStatus;
  notes?: string | null;
  createdAt?: string;
}

interface DrugItem {
  id: string;
  value: string;
}

export default function DoctorConsultationScreen() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [activeConsultation, setActiveConsultation] =
    useState<Consultation | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [showSession, setShowSession] = useState(false);
  const [showClinicalForm, setShowClinicalForm] = useState(false);

  const [diagnosis, setDiagnosis] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [labRequest, setLabRequest] = useState('');
  const [drugs, setDrugs] = useState<DrugItem[]>([
    { id: createLocalId(), value: '' },
  ]);

  useEffect(() => {
    fetchConsultations();
  }, []);

  const validDrugList = useMemo(
    () =>
      drugs
        .map((drug) => drug.value.trim())
        .filter((drug) => drug.length > 0),
    [drugs]
  );

  const prescriptionText = useMemo(
    () => validDrugList.join(', '),
    [validDrugList]
  );

  const fetchConsultations = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get('/consultations/doctor/me');

      const data: Consultation[] = Array.isArray(response.data)
        ? response.data
        : [];

      setConsultations(data);
    } catch (error: any) {
      console.error(
        'Failed to fetch consultations:',
        error.response?.data || error.message
      );

      Alert.alert(
        'Unable to load consultations',
        getErrorMessage(error, 'Please try again.')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoin = async (consultation: Consultation) => {
    if (submitting || joining) {
      return;
    }

    if (
      consultation.status === 'COMPLETED' ||
      consultation.status === 'CANCELLED'
    ) {
      Alert.alert(
        'Session unavailable',
        'Completed or cancelled consultations cannot be joined.'
      );
      return;
    }

    setJoining(consultation.id);

    try {
      const response = await api.put(
        `/consultations/${consultation.id}/join`
      );

      const updatedConsultation: Consultation = response.data;

      if (!updatedConsultation.sessionUrl) {
        throw new Error('The server did not return a consultation session URL.');
      }

      setActiveConsultation(updatedConsultation);
      setSessionUrl(updatedConsultation.sessionUrl);
      setShowSession(true);

      setConsultations((current) =>
        current.map((item) =>
          item.id === updatedConsultation.id
            ? updatedConsultation
            : item
        )
      );
    } catch (error: any) {
      console.error(
        'Failed to join consultation:',
        error.response?.data || error.message
      );

      Alert.alert(
        'Unable to join session',
        getErrorMessage(error, 'Failed to join the consultation.')
      );
    } finally {
      setJoining(null);
    }
  };

  const handleEndVideoSession = () => {
    setShowSession(false);
    setShowClinicalForm(true);
  };

  const handleReturnToVideo = () => {
    if (!sessionUrl) {
      return;
    }

    setShowClinicalForm(false);
    setShowSession(true);
  };

  const addDrugField = () => {
    setDrugs((current) => [
      ...current,
      {
        id: createLocalId(),
        value: '',
      },
    ]);
  };

  const updateDrug = (id: string, value: string) => {
    setDrugs((current) =>
      current.map((drug) =>
        drug.id === id
          ? {
              ...drug,
              value,
            }
          : drug
      )
    );
  };

  const removeDrug = (id: string) => {
    setDrugs((current) => {
      if (current.length === 1) {
        return [{ ...current[0], value: '' }];
      }

      return current.filter((drug) => drug.id !== id);
    });
  };

  const validateClinicalForm = () => {
    if (!activeConsultation) {
      Alert.alert('Error', 'No active consultation was selected.');
      return false;
    }

    if (!activeConsultation.queueEntryId) {
      Alert.alert(
        'Missing queue entry',
        'This consultation has no queueEntryId. Confirm that the backend DTO, entity, service and database migration were updated.'
      );
      return false;
    }

    if (!diagnosis.trim()) {
      Alert.alert('Diagnosis required', 'Enter the patient’s diagnosis.');
      return false;
    }

    if (diagnosis.trim().length > 500) {
      Alert.alert(
        'Diagnosis too long',
        'Diagnosis cannot exceed 500 characters.'
      );
      return false;
    }

    return true;
  };

  const handleFinishConsultation = async () => {
    if (!validateClinicalForm() || !activeConsultation) {
      return;
    }

    setSubmitting(true);

    try {
      /*
       * Step 1:
       * Save the clinical record before completing the consultation.
       */
      await api.post('/clinical-records', {
        queueEntryId: activeConsultation.queueEntryId,
        diagnosis: diagnosis.trim(),
        consultationNotes: toNullableText(consultationNotes),
        prescription: prescriptionText || null,
        labRequest: toNullableText(labRequest),
      });

      /*
       * Step 2:
       * Create the structured prescription only when drugs were entered.
       */
      if (validDrugList.length > 0) {
        await api.post('/prescriptions', {
          consultationId: activeConsultation.id,
          drugs: validDrugList,
        });
      }

      /*
       * Step 3:
       * Mark the consultation as completed only after the clinical
       * record and optional prescription have been saved.
       */
      await api.put(
        `/consultations/${activeConsultation.id}/complete`,
        {
          notes: consultationNotes.trim(),
        }
      );

      Alert.alert(
        'Consultation completed',
        validDrugList.length > 0
          ? 'The clinical record and prescription were saved successfully.'
          : 'The clinical record was saved successfully.',
        [
          {
            text: 'OK',
            onPress: async () => {
              resetConsultationWorkspace();
              await fetchConsultations(true);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error(
        'Failed to complete consultation:',
        error.response?.data || error.message
      );

      Alert.alert(
        'Could not complete consultation',
        getErrorMessage(
          error,
          'One of the consultation records could not be saved.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCloseClinicalForm = () => {
    if (submitting) {
      return;
    }

    Alert.alert(
      'Leave consultation form?',
      'The consultation has not been completed. Your unsaved clinical information will be lost.',
      [
        {
          text: 'Continue editing',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            resetConsultationWorkspace();
          },
        },
      ]
    );
  };

  const resetConsultationWorkspace = () => {
    setShowSession(false);
    setShowClinicalForm(false);
    setSessionUrl(null);
    setActiveConsultation(null);

    setDiagnosis('');
    setConsultationNotes('');
    setLabRequest('');
    setDrugs([{ id: createLocalId(), value: '' }]);
  };

  const STATUS_COLORS: Record<ConsultationStatus, string> = {
    SCHEDULED: Colors.warning,
    IN_PROGRESS: Colors.primary,
    COMPLETED: Colors.success,
    CANCELLED: Colors.danger,
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading consultations...</Text>
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient
          colors={[
            Colors.headerGradientStart,
            Colors.headerGradientEnd,
          ]}
          style={styles.header}
        >
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>My Consultations</Text>
              <Text style={styles.headerSubtitle}>
                Scheduled, ongoing and completed sessions
              </Text>
            </View>

            <TouchableOpacity
              style={styles.headerRefreshButton}
              onPress={() => fetchConsultations(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons
                  name="refresh-outline"
                  size={21}
                  color={Colors.white}
                />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchConsultations(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {consultations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="videocam-outline"
                  size={36}
                  color={Colors.primary}
                />
              </View>

              <Text style={styles.emptyText}>
                No upcoming consultations
              </Text>

              <Text style={styles.emptySubtext}>
                Scheduled patient consultations will appear here.
              </Text>
            </View>
          ) : (
            consultations.map((consultation) => {
              const statusColor =
                STATUS_COLORS[consultation.status] || Colors.textSecondary;

              const isJoining = joining === consultation.id;

              return (
                <View
                  key={consultation.id}
                  style={styles.consultationCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.patientAvatar}>
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color={Colors.primary}
                      />
                    </View>

                    <View style={styles.cardInfo}>
                      <Text style={styles.patientLabel}>
                        Patient consultation
                      </Text>

                      <Text style={styles.scheduledTime}>
                        {formatConsultationDate(
                          consultation.scheduledAt
                        )}
                      </Text>

                      <Text style={styles.patientIdText}>
                        Patient ID: {shortenId(consultation.patientId)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${statusColor}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: statusColor,
                          },
                        ]}
                      >
                        {formatStatus(consultation.status)}
                      </Text>
                    </View>
                  </View>

                  {!consultation.queueEntryId && (
                    <View style={styles.warningBox}>
                      <Ionicons
                        name="warning-outline"
                        size={17}
                        color={Colors.warning}
                      />

                      <Text style={styles.warningText}>
                        Queue entry is missing. Clinical records cannot
                        be saved until the backend returns queueEntryId.
                      </Text>
                    </View>
                  )}

                  {consultation.status !== 'COMPLETED' &&
                    consultation.status !== 'CANCELLED' && (
                      <TouchableOpacity
                        style={[
                          styles.joinButton,
                          isJoining && styles.buttonDisabled,
                        ]}
                        onPress={() => handleJoin(consultation)}
                        disabled={isJoining || submitting}
                      >
                        <LinearGradient
                          colors={[
                            Colors.headerGradientStart,
                            Colors.headerGradientEnd,
                          ]}
                          style={styles.joinButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          {isJoining ? (
                            <ActivityIndicator
                              size="small"
                              color={Colors.white}
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="videocam-outline"
                                size={17}
                                color={Colors.white}
                              />

                              <Text style={styles.joinButtonText}>
                                {consultation.status === 'IN_PROGRESS'
                                  ? 'Rejoin session'
                                  : 'Start session'}
                              </Text>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Video consultation */}
      <Modal
        visible={showSession}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleEndVideoSession}
      >
        <SafeAreaView
          style={styles.sessionSafeArea}
          edges={['top']}
        >
          <View style={styles.sessionHeader}>
            <View style={styles.sessionHeaderInfo}>
              <View style={styles.liveIndicator} />

              <View>
                <Text style={styles.sessionTitle}>
                  Live consultation
                </Text>

                <Text style={styles.sessionSubtitle}>
                  Patient {shortenId(activeConsultation?.patientId)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.endButton}
              onPress={handleEndVideoSession}
            >
              <Ionicons
                name="document-text-outline"
                size={17}
                color={Colors.white}
              />

              <Text style={styles.endButtonText}>
                Clinical notes
              </Text>
            </TouchableOpacity>
          </View>

          {sessionUrl ? (
            <WebView
              source={{ uri: sessionUrl }}
              style={styles.webview}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoader}>
                  <ActivityIndicator
                    size="large"
                    color={Colors.primary}
                  />
                  <Text style={styles.webviewLoadingText}>
                    Connecting to session...
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.webviewLoader}>
              <Ionicons
                name="videocam-off-outline"
                size={48}
                color={Colors.textDisabled}
              />
              <Text style={styles.webviewLoadingText}>
                Session URL is unavailable.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Clinical workspace */}
      <Modal
        visible={showClinicalForm}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={confirmCloseClinicalForm}
      >
        <SafeAreaView
          style={styles.clinicalSafeArea}
          edges={['top']}
        >
          <LinearGradient
            colors={[
              Colors.headerGradientStart,
              Colors.headerGradientEnd,
            ]}
            style={styles.clinicalHeader}
          >
            <View style={styles.clinicalHeaderRow}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={handleReturnToVideo}
                disabled={!sessionUrl || submitting}
              >
                <Ionicons
                  name="videocam-outline"
                  size={21}
                  color={Colors.white}
                />
              </TouchableOpacity>

              <View style={styles.clinicalHeaderText}>
                <Text style={styles.clinicalHeaderTitle}>
                  Clinical workspace
                </Text>

                <Text style={styles.clinicalHeaderSubtitle}>
                  Record findings and complete consultation
                </Text>
              </View>

              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={confirmCloseClinicalForm}
                disabled={submitting}
              >
                <Ionicons
                  name="close-outline"
                  size={24}
                  color={Colors.white}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              style={styles.clinicalContainer}
              contentContainerStyle={styles.clinicalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.patientSummaryCard}>
                <View style={styles.summaryIcon}>
                  <Ionicons
                    name="person-outline"
                    size={23}
                    color={Colors.primary}
                  />
                </View>

                <View style={styles.summaryDetails}>
                  <Text style={styles.summaryTitle}>
                    Patient consultation
                  </Text>

                  <Text style={styles.summaryText}>
                    Patient ID: {shortenId(activeConsultation?.patientId)}
                  </Text>

                  <Text style={styles.summaryText}>
                    Queue entry:{' '}
                    {shortenId(activeConsultation?.queueEntryId)}
                  </Text>
                </View>

                <View style={styles.inProgressBadge}>
                  <Text style={styles.inProgressText}>
                    In progress
                  </Text>
                </View>
              </View>

              <View style={styles.formSection}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      name="medkit-outline"
                      size={18}
                      color={Colors.primary}
                    />
                  </View>

                  <Text style={styles.sectionTitle}>
                    Clinical assessment
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>
                  Diagnosis <Text style={styles.required}>*</Text>
                </Text>

                <Text style={styles.fieldHint}>
                  Required. Maximum 500 characters.
                </Text>

                <TextInput
                  style={[styles.input, styles.largeTextArea]}
                  placeholder="Enter the patient's diagnosis..."
                  placeholderTextColor={Colors.textDisabled}
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                  multiline
                  maxLength={500}
                  numberOfLines={5}
                  textAlignVertical="top"
                  editable={!submitting}
                />

                <Text style={styles.characterCount}>
                  {diagnosis.length}/500
                </Text>

                <Text style={styles.fieldLabel}>
                  Consultation notes
                </Text>

                <Text style={styles.fieldHint}>
                  Symptoms, observations, treatment advice and follow-up.
                </Text>

                <TextInput
                  style={[styles.input, styles.largeTextArea]}
                  placeholder="Enter clinical observations and advice..."
                  placeholderTextColor={Colors.textDisabled}
                  value={consultationNotes}
                  onChangeText={setConsultationNotes}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  editable={!submitting}
                />

                <Text style={styles.fieldLabel}>
                  Laboratory request
                </Text>

                <Text style={styles.fieldHint}>
                  Leave blank when no laboratory test is required.
                </Text>

                <TextInput
                  style={[styles.input, styles.mediumTextArea]}
                  placeholder="e.g. Full blood count, malaria test..."
                  placeholderTextColor={Colors.textDisabled}
                  value={labRequest}
                  onChangeText={setLabRequest}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!submitting}
                />
              </View>

              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionIcon}>
                      <Ionicons
                        name="medical-outline"
                        size={18}
                        color={Colors.primary}
                      />
                    </View>

                    <Text style={styles.sectionTitle}>
                      Prescription
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.addDrugButton}
                    onPress={addDrugField}
                    disabled={submitting}
                  >
                    <Ionicons
                      name="add-outline"
                      size={18}
                      color={Colors.primary}
                    />

                    <Text style={styles.addDrugText}>
                      Add drug
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldHint}>
                  Optional. Include medication name, dosage, frequency
                  and duration.
                </Text>

                {drugs.map((drug, index) => (
                  <View key={drug.id} style={styles.drugRow}>
                    <View style={styles.drugNumber}>
                      <Text style={styles.drugNumberText}>
                        {index + 1}
                      </Text>
                    </View>

                    <TextInput
                      style={[styles.input, styles.drugInput]}
                      placeholder="e.g. Paracetamol 500mg, twice daily for 5 days"
                      placeholderTextColor={Colors.textDisabled}
                      value={drug.value}
                      onChangeText={(value) =>
                        updateDrug(drug.id, value)
                      }
                      editable={!submitting}
                    />

                    <TouchableOpacity
                      style={styles.removeDrugButton}
                      onPress={() => removeDrug(drug.id)}
                      disabled={submitting}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color={Colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                {validDrugList.length === 0 && (
                  <View style={styles.optionalNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={Colors.textSecondary}
                    />

                    <Text style={styles.optionalNoticeText}>
                      The consultation can be completed without a
                      prescription.
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.finishButton,
                  submitting && styles.buttonDisabled,
                ]}
                onPress={handleFinishConsultation}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={Colors.white}
                    />
                    <Text style={styles.finishButtonText}>
                      Saving consultation...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={21}
                      color={Colors.white}
                    />

                    <Text style={styles.finishButtonText}>
                      Finish consultation
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.finishHint}>
                This saves the clinical record, creates the optional
                prescription and marks the consultation as completed.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toNullableText(value: string) {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function getErrorMessage(error: any, fallback: string) {
  const responseData = error?.response?.data;

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData;
  }

  if (
    responseData?.message &&
    typeof responseData.message === 'string'
  ) {
    return responseData.message;
  }

  if (
    responseData?.error &&
    typeof responseData.error === 'string'
  ) {
    return responseData.error;
  }

  if (error?.message && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

function formatConsultationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid consultation date';
  }

  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortenId(value?: string | null) {
  if (!value) {
    return 'Unavailable';
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(' ');
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: Colors.headerGradientStart,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },

  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },

  headerRefreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },

  consultationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardInfo: {
    flex: 1,
  },

  patientLabel: {
    fontSize: 11,
    color: Colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  scheduledTime: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 3,
  },

  patientIdText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: `${Colors.warning}12`,
  },

  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },

  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  joinButtonGradient: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },

  joinButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  sessionSafeArea: {
    flex: 1,
    backgroundColor: Colors.headerGradientStart,
  },

  sessionHeader: {
    minHeight: 68,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: Colors.headerGradientStart,
  },

  sessionHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  liveIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
  },

  sessionTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  sessionSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },

  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.danger,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 9,
  },

  endButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 12,
  },

  webview: {
    flex: 1,
  },

  webviewLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },

  webviewLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  clinicalSafeArea: {
    flex: 1,
    backgroundColor: Colors.headerGradientStart,
  },

  clinicalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  clinicalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  clinicalHeaderText: {
    flex: 1,
    marginHorizontal: 12,
  },

  clinicalHeaderTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.white,
  },

  clinicalHeaderSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  clinicalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  clinicalContent: {
    padding: 18,
    paddingBottom: 48,
  },

  patientSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },

  summaryDetails: {
    flex: 1,
    marginLeft: 12,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  summaryText: {
    marginTop: 3,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  inProgressBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}18`,
  },

  inProgressText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },

  formSection: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
    marginTop: 14,
  },

  required: {
    color: Colors.danger,
  },

  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textDisabled,
    marginBottom: 8,
  },

  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  largeTextArea: {
    minHeight: 120,
  },

  mediumTextArea: {
    minHeight: 85,
  },

  characterCount: {
    alignSelf: 'flex-end',
    marginTop: 5,
    fontSize: 11,
    color: Colors.textDisabled,
  },

  addDrugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: Colors.primaryLight,
  },

  addDrugText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  drugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  drugNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },

  drugNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  drugInput: {
    flex: 1,
  },

  removeDrugButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${Colors.danger}12`,
  },

  optionalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 14,
    padding: 11,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },

  optionalNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },

  finishButton: {
    minHeight: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
    backgroundColor: Colors.primary,
  },

  finishButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  finishHint: {
    marginTop: 10,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textDisabled,
  },
});