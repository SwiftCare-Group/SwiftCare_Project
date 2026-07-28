import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../../constants/colors';
import api from '../../../services/api';

type PatientDetails = {
  id: string;
  patientId?: string;
  patientName?: string;
  patientNumber?: string;
  age?: number;
  gender?: string;
  chiefComplaint?: string;
  severityScore?: number;
  severityLabel?: string;
  scheduledTime?: string;
  status?: string;
  departmentId?: string;
  departmentName?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getSingleParam = (
  value?: string | string[]
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const isValidRouteId = (
  value?: string
): value is string => {
  return Boolean(
    value &&
      value !== 'undefined' &&
      value !== 'null' &&
      UUID_PATTERN.test(value)
  );
};

const getBackendMessage = (
  error: any,
  fallbackMessage: string
): string => {
  const responseData = error?.response?.data;

  if (typeof responseData?.message === 'string') {
    return responseData.message;
  }

  if (typeof responseData?.error === 'string') {
    return responseData.error;
  }

  if (typeof responseData === 'string') {
    return responseData;
  }

  if (error?.code === 'ECONNABORTED') {
    return 'The request took too long. Please check your connection and try again.';
  }

  if (!error?.response) {
    return 'The server could not be reached. Check that the backend is running and your device is connected to the same network.';
  }

  return fallbackMessage;
};


const splitEntries = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );

const toNullableNumber = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function ConsultationScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    queueEntryId?: string | string[];
    patientId?: string | string[];
  }>();

  const queueEntryId = getSingleParam(
    params.queueEntryId
  );

  const routePatientId = getSingleParam(
    params.patientId
  );

  const [patient, setPatient] =
    useState<PatientDetails | null>(null);

  const [diagnosis, setDiagnosis] =
    useState('');

  const [
    consultationNotes,
    setConsultationNotes,
  ] = useState('');

  const [prescription, setPrescription] =
    useState('');

  const [labRequest, setLabRequest] =
    useState('');

  const [temperature, setTemperature] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [oxygenSaturation, setOxygenSaturation] = useState('');
  const [weight, setWeight] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [referralNotes, setReferralNotes] = useState('');

  const [loading, setLoading] =
    useState(true);

  const [completing, setCompleting] =
    useState(false);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const fetchPatientDetails = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setLoadFailed(false);
        const response = await api.get(
          `/queue/${id}`,
          {
            timeout: 15000,
          }
        );

        setPatient(response.data);
      } catch (error: any) {
        setPatient(null);
        setLoadFailed(true);
        Alert.alert(
          'Unable to load consultation',
          getBackendMessage(
            error,
            'The patient details could not be loaded.'
          )
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isValidRouteId(queueEntryId)) {
      setLoading(false);
      setLoadFailed(true);

      Alert.alert(
        'Unable to open consultation',
        'A valid queue entry ID was not provided.',
        [
          {
            text: 'Go back',
            onPress: () => router.back(),
          },
        ]
      );

      return;
    }

    fetchPatientDetails(queueEntryId);
  }, [
    fetchPatientDetails,
    queueEntryId,
    routePatientId,
    router,
  ]);

  const completeConsultation = async () => {
    if (completing) {
      return;
    }

    if (!isValidRouteId(queueEntryId)) {
      Alert.alert(
        'Invalid consultation',
        'The queue entry ID is missing or invalid.'
      );

      return;
    }

    const cleanedDiagnosis =
      diagnosis.trim();

    if (!cleanedDiagnosis) {
      Alert.alert(
        'Diagnosis required',
        'Please enter the patient diagnosis before completing the consultation.'
      );

      return;
    }

    if (cleanedDiagnosis.length > 500) {
      Alert.alert(
        'Diagnosis too long',
        'The diagnosis cannot exceed 500 characters.'
      );

      return;
    }

    try {
      setCompleting(true);

      const drugs = splitEntries(prescription);
      const labOrders = splitEntries(labRequest).map((testName) => ({
        testName,
        clinicalReason: cleanedDiagnosis,
        instructions: null,
      }));

      await api.post(
        '/consultations/complete-workflow',
        {
          queueEntryId,
          diagnosis: cleanedDiagnosis,
          consultationNotes: consultationNotes.trim() || null,
          temperatureCelsius: toNullableNumber(temperature),
          bloodPressure: bloodPressure.trim() || null,
          pulseRate: toNullableNumber(pulseRate),
          respiratoryRate: toNullableNumber(respiratoryRate),
          oxygenSaturation: toNullableNumber(oxygenSaturation),
          weightKg: toNullableNumber(weight),
          followUpInstructions: followUpInstructions.trim() || null,
          referralNotes: referralNotes.trim() || null,
          drugs,
          labOrders,
        },
        {
          timeout: 30000,
        }
      );

      Alert.alert(
        'Consultation completed',
        'The clinical record was saved and the patient was removed from the active queue.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace(
                '/(doctor)/queue' as any
              );
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to complete consultation',
        getBackendMessage(
          error,
          'The consultation could not be completed. Please try again.'
        )
      );
    } finally {
      setCompleting(false);
    }
  };

  const handleCompleteConsultation = () => {
    if (completing) {
      return;
    }

    if (!isValidRouteId(queueEntryId)) {
      Alert.alert(
        'Consultation error',
        'The queue entry ID is missing or invalid.'
      );

      return;
    }

    if (!diagnosis.trim()) {
      Alert.alert(
        'Diagnosis required',
        'Please enter a diagnosis before completing the consultation.'
      );

      return;
    }

    Alert.alert(
      'Complete consultation',
      'Are you sure you want to save this clinical record and complete the consultation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete',
          onPress: completeConsultation,
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading consultation...
        </Text>
      </View>
    );
  }

  if (loadFailed && !patient) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'bottom']}
      >
        <LinearGradient
          colors={[
            Colors.headerGradientStart,
            Colors.headerGradientEnd,
          ]}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={Colors.white}
              />
            </TouchableOpacity>

            <View
              style={
                styles.headerTextContainer
              }
            >
              <Text
                style={styles.headerTitle}
              >
                Consultation
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Patient details unavailable
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.errorState}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={46}
              color={Colors.danger}
            />
          </View>

          <Text style={styles.errorTitle}>
            Consultation could not be loaded
          </Text>

          <Text
            style={styles.errorDescription}
          >
            The queue entry information is
            missing or could not be retrieved.
          </Text>

          {isValidRouteId(queueEntryId) ? (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() =>
                fetchPatientDetails(
                  queueEntryId
                )
              }
              activeOpacity={0.85}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={Colors.white}
              />

              <Text
                style={
                  styles.retryButtonText
                }
              >
                Try again
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text
              style={styles.goBackButtonText}
            >
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >
      <LinearGradient
        colors={[
          Colors.headerGradientStart,
          Colors.headerGradientEnd,
        ]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={completing}
            activeOpacity={0.85}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={Colors.white}
            />
          </TouchableOpacity>

          <View
            style={styles.headerTextContainer}
          >
            <Text style={styles.headerTitle}>
              Consultation
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Record medical findings and
              treatment
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.patientCard}>
          <View style={styles.patientAvatar}>
            <Ionicons
              name="person-outline"
              size={30}
              color={Colors.primary}
            />
          </View>

          <View
            style={styles.patientInformation}
          >
            <Text style={styles.patientName}>
              {patient?.patientName ??
                'Patient information'}
            </Text>

            <Text style={styles.patientId}>
              Patient ID:{' '}
              {patient?.patientNumber ??
                patient?.patientId ??
                routePatientId ??
                'Not available'}
            </Text>

            {(patient?.age ||
              patient?.gender) && (
              <Text
                style={styles.patientMeta}
              >
                {patient?.age
                  ? `${patient.age} years`
                  : ''}
                {patient?.age &&
                patient?.gender
                  ? ' • '
                  : ''}
                {patient?.gender ?? ''}
              </Text>
            )}
          </View>

          <View style={styles.severityBadge}>
            <Text style={styles.severityText}>
              {patient?.severityScore ?? 0}/4
            </Text>
          </View>
        </View>

        <View style={styles.complaintCard}>
          <Text style={styles.sectionLabel}>
            CHIEF COMPLAINT
          </Text>

          <Text style={styles.complaintText}>
            {patient?.chiefComplaint ??
              'No complaint information provided.'}
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>
            Diagnosis
          </Text>

          <TextInput
            style={styles.input}
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="Enter the diagnosis"
            placeholderTextColor={
              Colors.textDisabled
            }
            editable={!completing}
            maxLength={500}
            returnKeyType="done"
          />

          <Text style={styles.characterCount}>
            {diagnosis.length}/500
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>
            Consultation notes
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
            ]}
            value={consultationNotes}
            onChangeText={
              setConsultationNotes
            }
            placeholder="Symptoms, examination findings and observations"
            placeholderTextColor={
              Colors.textDisabled
            }
            multiline
            textAlignVertical="top"
            editable={!completing}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Vital signs</Text>
          <Text style={styles.fieldHint}>
            Enter the available measurements. Leave unknown values blank.
          </Text>

          <View style={styles.vitalsGrid}>
            <TextInput
              style={[styles.input, styles.vitalInput]}
              value={temperature}
              onChangeText={setTemperature}
              placeholder="Temperature °C"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="decimal-pad"
              editable={!completing}
            />
            <TextInput
              style={[styles.input, styles.vitalInput]}
              value={bloodPressure}
              onChangeText={setBloodPressure}
              placeholder="Blood pressure 120/80"
              placeholderTextColor={Colors.textDisabled}
              editable={!completing}
            />
            <TextInput
              style={[styles.input, styles.vitalInput]}
              value={pulseRate}
              onChangeText={setPulseRate}
              placeholder="Pulse bpm"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="number-pad"
              editable={!completing}
            />
            <TextInput
              style={[styles.input, styles.vitalInput]}
              value={respiratoryRate}
              onChangeText={setRespiratoryRate}
              placeholder="Respiratory rate"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="number-pad"
              editable={!completing}
            />
            <TextInput
              style={[styles.input, styles.vitalInput]}
              value={oxygenSaturation}
              onChangeText={setOxygenSaturation}
              placeholder="SpO₂ %"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="number-pad"
              editable={!completing}
            />
            <TextInput
              style={[styles.input, styles.vitalInput]}
              value={weight}
              onChangeText={setWeight}
              placeholder="Weight kg"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="decimal-pad"
              editable={!completing}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>
            Prescription
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
            ]}
            value={prescription}
            onChangeText={setPrescription}
            placeholder="Medication, dosage and instructions"
            placeholderTextColor={
              Colors.textDisabled
            }
            multiline
            textAlignVertical="top"
            editable={!completing}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>
            Lab request
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
            ]}
            value={labRequest}
            onChangeText={setLabRequest}
            placeholder="Enter any required laboratory tests"
            placeholderTextColor={
              Colors.textDisabled
            }
            multiline
            textAlignVertical="top"
            editable={!completing}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Follow-up instructions</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={followUpInstructions}
            onChangeText={setFollowUpInstructions}
            placeholder="Review date, home care and warning signs"
            placeholderTextColor={Colors.textDisabled}
            multiline
            textAlignVertical="top"
            editable={!completing}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Referral notes</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={referralNotes}
            onChangeText={setReferralNotes}
            placeholder="Optional referral destination and reason"
            placeholderTextColor={Colors.textDisabled}
            multiline
            textAlignVertical="top"
            editable={!completing}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.completeButton,
            completing &&
              styles.disabledButton,
          ]}
          onPress={
            handleCompleteConsultation
          }
          disabled={
            completing ||
            !isValidRouteId(queueEntryId)
          }
          activeOpacity={0.85}
        >
          {completing ? (
            <>
              <ActivityIndicator
                size="small"
                color={Colors.white}
              />

              <Text
                style={
                  styles.completeButtonText
                }
              >
                Completing...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color={Colors.white}
              />

              <Text
                style={
                  styles.completeButtonText
                }
              >
                Complete consultation
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      Colors.headerGradientStart,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 18,
    paddingBottom: 70,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,
    marginRight: 12,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.16)',
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: Colors.white,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: 'rgba(255,255,255,0.76)',
  },

  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },

  patientAvatar: {
    width: 52,
    height: 52,
    marginRight: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  patientInformation: {
    flex: 1,
  },

  patientName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  patientId: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  patientMeta: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  severityBadge: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor:
      `${Colors.warning}18`,
  },

  severityText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.warning,
  },

  complaintCard: {
    marginTop: 15,
    padding: 15,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: Colors.primary,
  },

  complaintText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  fieldHint: {
    marginTop: -4,
    marginBottom: 10,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },

  vitalInput: {
    width: '48%',
    marginBottom: 0,
  },

  formSection: {
    marginTop: 19,
  },

  fieldLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },

  multilineInput: {
    minHeight: 110,
  },

  characterCount: {
    marginTop: 5,
    alignSelf: 'flex-end',
    fontSize: 11,
    color: Colors.textSecondary,
  },

  completeButton: {
    minHeight: 52,
    marginTop: 26,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.success,
  },

  completeButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },

  disabledButton: {
    opacity: 0.65,
  },

  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: Colors.background,
  },

  errorIcon: {
    width: 84,
    height: 84,
    marginBottom: 18,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      `${Colors.danger}12`,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: Colors.textPrimary,
  },

  errorDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.textSecondary,
  },

  retryButton: {
    minWidth: 150,
    minHeight: 48,
    marginTop: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },

  retryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },

  goBackButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  goBackButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});