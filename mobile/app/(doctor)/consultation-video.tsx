import { useTheme, type AppColors } from '../../context/ThemeContext';
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
import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import api from '../../services/api';
import { requestVideoConsultationPermissions } from '../../services/videoPermissions';
import { Colors } from '../../constants/colors';
import { getApiErrorMessage } from '../../utils/errors';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';

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
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [diagnosis, setDiagnosis] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [labRequest, setLabRequest] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [oxygenSaturation, setOxygenSaturation] = useState('');
  const [weight, setWeight] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [drugs, setDrugs] = useState<DrugItem[]>([
    { id: createLocalId(), value: '' },
  ]);

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
    } catch (error: unknown) {
      Alert.alert(
        'Unable to load consultations',
        getApiErrorMessage(error, { fallback: 'Please try again.' })
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useRefreshOnFocus(() => fetchConsultations());

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

    if (
      consultation.status !== 'IN_PROGRESS' &&
      Date.parse(consultation.scheduledAt) > Date.now() + 15 * 60_000
    ) {
      Alert.alert(
        'Room not open yet',
        'You can join 15 minutes before the scheduled time.'
      );
      return;
    }

    setJoining(consultation.id);

    try {
      const permissions = await requestVideoConsultationPermissions();
      if (!permissions.granted) {
        Alert.alert(
          'Camera and microphone required',
          permissions.canAskAgain
            ? 'Allow camera and microphone access to join the video consultation.'
            : 'Camera or microphone access is blocked. Enable both permissions in your device settings and try again.'
        );
        return;
      }

      const response = await api.put(
        `/consultations/${consultation.id}/join`
      );

      const updatedConsultation: Consultation = response.data;

      if (
        typeof updatedConsultation.sessionUrl !== 'string' ||
        !/^https:\/\//i.test(updatedConsultation.sessionUrl)
      ) {
        throw new Error('The server did not return a valid consultation session URL.');
      }

      setActiveConsultation(updatedConsultation);
      setSessionError(null);
      setSessionUrl(updatedConsultation.sessionUrl);
      setShowSession(true);

      setConsultations((current) =>
        current.map((item) =>
          item.id === updatedConsultation.id
            ? updatedConsultation
            : item
        )
      );
    } catch (error: unknown) {
      Alert.alert(
        'Unable to join session',
        getApiErrorMessage(error, {
          fallback: 'Failed to join the consultation.',
          conflict: 'The room opens 15 minutes before the scheduled consultation.',
        })
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

    const validationMessage =
      validateOptionalRange('Temperature', temperature, 30, 45) ??
      validateBloodPressure(bloodPressure) ??
      validateOptionalRange('Pulse rate', pulseRate, 20, 250) ??
      validateOptionalRange('Respiratory rate', respiratoryRate, 5, 80) ??
      validateOptionalRange('Oxygen saturation', oxygenSaturation, 0, 100) ??
      validateOptionalRange('Weight', weight, 1, 500);

    if (validationMessage) {
      Alert.alert('Check vital signs', validationMessage);
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
      const labOrders = splitEntries(labRequest).map((testName) => ({
        testName,
        clinicalReason: diagnosis.trim(),
        instructions: null,
      }));

      await api.post(
        '/consultations/complete-workflow',
        {
          consultationId: activeConsultation.id,
          queueEntryId: activeConsultation.queueEntryId,
          diagnosis: diagnosis.trim(),
          consultationNotes: toNullableText(consultationNotes),
          temperatureCelsius: toNullableNumber(temperature),
          bloodPressure: toNullableText(bloodPressure.replace(/\s+/g, '')),
          pulseRate: toNullableNumber(pulseRate),
          respiratoryRate: toNullableNumber(respiratoryRate),
          oxygenSaturation: toNullableNumber(oxygenSaturation),
          weightKg: toNullableNumber(weight),
          followUpInstructions: toNullableText(followUpInstructions),
          referralNotes: toNullableText(referralNotes),
          drugs: validDrugList,
          labOrders,
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
    } catch (error: unknown) {
      Alert.alert(
        'Could not complete consultation',
        getApiErrorMessage(error, {
          fallback: 'One of the consultation records could not be saved.',
          validation: 'Review the consultation fields and try again.',
          conflict: 'This consultation was already completed or changed.',
        })
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
    setTemperature('');
    setBloodPressure('');
    setPulseRate('');
    setRespiratoryRate('');
    setOxygenSaturation('');
    setWeight('');
    setFollowUpInstructions('');
    setReferralNotes('');
    setDrugs([{ id: createLocalId(), value: '' }]);
  };

  const STATUS_COLORS: Record<ConsultationStatus, string> = {
    SCHEDULED: colors.warning,
    IN_PROGRESS: colors.primary,
    COMPLETED: colors.success,
    CANCELLED: colors.danger,
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading consultations...</Text>
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient
          colors={[
            colors.headerGradientStart,
            colors.headerGradientEnd,
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
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons
                  name="refresh-outline"
                  size={21}
                  color={colors.white}
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
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {consultations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="videocam-outline"
                  size={36}
                  color={colors.primary}
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
                STATUS_COLORS[consultation.status] || colors.textSecondary;

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
                        color={colors.primary}
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
                            colors.headerGradientStart,
                            colors.headerGradientEnd,
                          ]}
                          style={styles.joinButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          {isJoining ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.white}
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="videocam-outline"
                                size={17}
                                color={colors.white}
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
                color={colors.white}
              />

              <Text style={styles.endButtonText}>
                Clinical notes
              </Text>
            </TouchableOpacity>
          </View>

          {sessionError ? (
            <View style={styles.webviewLoader}>
              <Ionicons name="warning-outline" size={48} color={colors.danger} />
              <Text style={styles.webviewLoadingText}>{sessionError}</Text>
            </View>
          ) : sessionUrl ? (
            <WebView
              source={{ uri: sessionUrl }}
              style={styles.webview}
              originWhitelist={['https://*']}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
              setSupportMultipleWindows={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              onError={() => setSessionError('The video session could not be loaded.')}
              onHttpError={event =>
                setSessionError(`The video provider returned status ${event.nativeEvent.statusCode}.`)
              }
              renderLoading={() => (
                <View style={styles.webviewLoader}>
                  <ActivityIndicator
                    size="large"
                    color={colors.primary}
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
                color={colors.textDisabled}
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
              colors.headerGradientStart,
              colors.headerGradientEnd,
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
                  color={colors.white}
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
                  color={colors.white}
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
                    color={colors.primary}
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
                      color={colors.primary}
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
                  placeholderTextColor={colors.textDisabled}
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
                  placeholderTextColor={colors.textDisabled}
                  value={consultationNotes}
                  onChangeText={setConsultationNotes}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  editable={!submitting}
                />

                <Text style={styles.fieldLabel}>Vital signs</Text>

                <Text style={styles.fieldHint}>
                  Enter available measurements. Unknown values can be left blank.
                </Text>

                <View style={styles.vitalsGrid}>
                  <TextInput
                    style={[styles.input, styles.vitalInput]}
                    placeholder="Temperature °C"
                    placeholderTextColor={colors.textDisabled}
                    value={temperature}
                    onChangeText={setTemperature}
                    keyboardType="decimal-pad"
                    editable={!submitting}
                  />
                  <TextInput
                    style={[styles.input, styles.vitalInput]}
                    placeholder="Blood pressure 120/80"
                    placeholderTextColor={colors.textDisabled}
                    value={bloodPressure}
                    onChangeText={setBloodPressure}
                    editable={!submitting}
                  />
                  <TextInput
                    style={[styles.input, styles.vitalInput]}
                    placeholder="Pulse bpm"
                    placeholderTextColor={colors.textDisabled}
                    value={pulseRate}
                    onChangeText={setPulseRate}
                    keyboardType="number-pad"
                    editable={!submitting}
                  />
                  <TextInput
                    style={[styles.input, styles.vitalInput]}
                    placeholder="Respiratory rate"
                    placeholderTextColor={colors.textDisabled}
                    value={respiratoryRate}
                    onChangeText={setRespiratoryRate}
                    keyboardType="number-pad"
                    editable={!submitting}
                  />
                  <TextInput
                    style={[styles.input, styles.vitalInput]}
                    placeholder="SpO₂ %"
                    placeholderTextColor={colors.textDisabled}
                    value={oxygenSaturation}
                    onChangeText={setOxygenSaturation}
                    keyboardType="number-pad"
                    editable={!submitting}
                  />
                  <TextInput
                    style={[styles.input, styles.vitalInput]}
                    placeholder="Weight kg"
                    placeholderTextColor={colors.textDisabled}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    editable={!submitting}
                  />
                </View>

                <Text style={styles.fieldLabel}>
                  Laboratory request
                </Text>

                <Text style={styles.fieldHint}>
                  Leave blank when no laboratory test is required.
                </Text>

                <TextInput
                  style={[styles.input, styles.mediumTextArea]}
                  placeholder="e.g. Full blood count, malaria test..."
                  placeholderTextColor={colors.textDisabled}
                  value={labRequest}
                  onChangeText={setLabRequest}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!submitting}
                />
              </View>

              <View style={styles.formSection}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.sectionTitle}>Follow-up and referral</Text>
                </View>

                <Text style={styles.fieldLabel}>Follow-up instructions</Text>
                <TextInput
                  style={[styles.input, styles.mediumTextArea]}
                  placeholder="Review date, home care and warning signs..."
                  placeholderTextColor={colors.textDisabled}
                  value={followUpInstructions}
                  onChangeText={setFollowUpInstructions}
                  multiline
                  textAlignVertical="top"
                  editable={!submitting}
                />

                <Text style={styles.fieldLabel}>Referral notes</Text>
                <TextInput
                  style={[styles.input, styles.mediumTextArea]}
                  placeholder="Optional referral destination and reason..."
                  placeholderTextColor={colors.textDisabled}
                  value={referralNotes}
                  onChangeText={setReferralNotes}
                  multiline
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
                        color={colors.primary}
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
                      color={colors.primary}
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
                      placeholderTextColor={colors.textDisabled}
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
                        color={colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                {validDrugList.length === 0 && (
                  <View style={styles.optionalNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={colors.textSecondary}
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
                      color={colors.white}
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
                      color={colors.white}
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

function splitEntries(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

function toNullableNumber(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateOptionalRange(
  label: string,
  value: string,
  minimum: number,
  maximum: number,
): string | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? null
    : `${label} must be between ${minimum} and ${maximum}.`;
}

function validateBloodPressure(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const match = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(normalized);
  if (!match) return 'Blood pressure must use the format 120/80.';
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  return systolic >= 60 && systolic <= 260 && diastolic >= 30 &&
    diastolic <= 160 && systolic > diastolic
    ? null
    : 'Enter a plausible blood pressure reading.';
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

const createStyles = (colors: AppColors) => StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.headerGradientStart,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
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
    color: colors.white,
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
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },

  emptySubtext: {
    fontSize: 13,
    color: colors.textDisabled,
    textAlign: 'center',
  },

  consultationCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardInfo: {
    flex: 1,
  },

  patientLabel: {
    fontSize: 11,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  scheduledTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 3,
  },

  patientIdText: {
    fontSize: 11,
    color: colors.textSecondary,
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
    backgroundColor: `${colors.warning}12`,
  },

  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
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
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  sessionSafeArea: {
    flex: 1,
    backgroundColor: colors.headerGradientStart,
  },

  sessionHeader: {
    minHeight: 68,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.headerGradientStart,
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
    backgroundColor: colors.danger,
  },

  sessionTitle: {
    color: colors.white,
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
    backgroundColor: colors.danger,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 9,
  },

  endButtonText: {
    color: colors.white,
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
    backgroundColor: colors.background,
  },

  webviewLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },

  clinicalSafeArea: {
    flex: 1,
    backgroundColor: colors.headerGradientStart,
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
    color: colors.white,
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
    backgroundColor: colors.background,
  },

  clinicalContent: {
    padding: 18,
    paddingBottom: 48,
  },

  patientSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primaryLight,
  },

  summaryDetails: {
    flex: 1,
    marginLeft: 12,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  summaryText: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textSecondary,
  },

  inProgressBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: `${colors.primary}18`,
  },

  inProgressText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  formSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primaryLight,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },

  vitalInput: {
    width: '48%',
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    marginTop: 14,
  },

  required: {
    color: colors.danger,
  },

  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textDisabled,
    marginBottom: 8,
  },

  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
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
    color: colors.textDisabled,
  },

  addDrugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
  },

  addDrugText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    backgroundColor: colors.primaryLight,
  },

  drugNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    backgroundColor: `${colors.danger}12`,
  },

  optionalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 14,
    padding: 11,
    borderRadius: 10,
    backgroundColor: colors.background,
  },

  optionalNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  finishButton: {
    minHeight: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
    backgroundColor: colors.primary,
  },

  finishButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  finishHint: {
    marginTop: 10,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: colors.textDisabled,
  },
});