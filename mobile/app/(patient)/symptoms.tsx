import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { useTheme, type AppColors } from '../../context/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';
import { getApiErrorMessage } from '../../utils/errors';


const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  MILD: { color: Colors.severityMild, bg: Colors.severityMildBg, icon: 'checkmark-circle-outline' },
  MODERATE: { color: Colors.severityModerate, bg: Colors.severityModerateBg, icon: 'alert-circle-outline' },
  SEVERE: { color: Colors.severitySevere, bg: Colors.severitySevereBg, icon: 'warning-outline' },
  EMERGENCY: { color: Colors.white, bg: Colors.severityCriticalBg, icon: 'nuclear-outline' },
};

const SAMPLE_SYMPTOMS = [
  'Mild headache and runny nose',
  'High fever and persistent cough',
  'Severe chest pain and difficulty breathing',
  'Dizziness and nausea',
];

const SEVERITY_OPTIONS = [
  {
    score: 1,
    label: 'MILD',
    title: 'Mild',
    description: 'Uncomfortable, but normal activities are still possible.',
    icon: 'checkmark-circle-outline',
  },
  {
    score: 2,
    label: 'MODERATE',
    title: 'Moderate',
    description: 'Symptoms interfere with some normal activities.',
    icon: 'alert-circle-outline',
  },
  {
    score: 3,
    label: 'SEVERE',
    title: 'Severe',
    description: 'Symptoms significantly affect daily activities.',
    icon: 'warning-outline',
  },
  {
    score: 4,
    label: 'EMERGENCY',
    title: 'Critical',
    description: 'Extreme symptoms or possible emergency warning signs.',
    icon: 'nuclear-outline',
  },
] as const;

const LAST_SYMPTOM_ASSESSMENT_KEY = 'lastSymptomAssessment';

export default function SymptomsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [charCount, setCharCount] = useState(0);
  const [selectedSeverity, setSelectedSeverity] =
    useState<number | null>(null);
  const { mediumTap, successNotification, warningNotification } = useHaptics();


  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    mediumTap();

    const trimmedSymptoms = symptoms.trim();

    if (!trimmedSymptoms) {
      Alert.alert('Symptoms Required', 'Please describe your symptoms.');
      return;
    }

    if (!selectedSeverity) {
      Alert.alert(
        'Severity Required',
        'Choose how severe your symptoms feel from 1 to 4.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/symptoms/submit', {
        symptoms: trimmedSymptoms,
        severityScore: selectedSeverity,
      });

      const returnedAiSeverity = Number(
        response.data?.aiRecommendedSeverityScore
      );

      const aiRecommendedSeverityScore =
        Number.isFinite(returnedAiSeverity) &&
        returnedAiSeverity >= 1 &&
        returnedAiSeverity <= 4
          ? Math.round(returnedAiSeverity)
          : undefined;

      const selectedOption = SEVERITY_OPTIONS.find(
        option => option.score === selectedSeverity
      );

      const assessmentId =
        response.data?.assessmentId ??
        response.data?.symptomAssessmentId ??
        response.data?.id;

      if (assessmentId == null || String(assessmentId).trim() === '') {
        throw new Error(
          'The symptom assessment was saved without an assessment ID.'
        );
      }

      const isEmergency =
        Boolean(response.data?.isEmergency) ||
        selectedSeverity === 4;

      const submittedAssessment = {
        ...response.data,
        assessmentId:
          typeof assessmentId === 'string'
            ? assessmentId
            : assessmentId != null
              ? String(assessmentId)
              : undefined,
        symptoms:
          typeof response.data?.symptoms === 'string'
            ? response.data.symptoms
            : trimmedSymptoms,
        severityScore: selectedSeverity,
        patientSeverityScore: selectedSeverity,
        severityLabel: selectedOption?.label ?? 'MILD',
        aiRecommendedSeverityScore,
        isEmergency,
        submittedAt: new Date().toISOString(),
      };

      setResult(submittedAssessment);

      await AsyncStorage.multiSet([
        ['lastSeverityScore', String(selectedSeverity)],
        [
          LAST_SYMPTOM_ASSESSMENT_KEY,
          JSON.stringify({
            assessmentId: submittedAssessment.assessmentId,
            symptoms: submittedAssessment.symptoms,
            severityScore: selectedSeverity,
            severityLabel: submittedAssessment.severityLabel,
            submittedAt: submittedAssessment.submittedAt,
            aiRecommendedSeverityScore,
            aiStatus: response.data?.aiStatus,
          }),
        ],
      ]);

      if (isEmergency) {
        warningNotification();
        Alert.alert(
          '🚨 EMERGENCY WARNING',
          'You selected critical severity or the assessment detected a possible emergency. Please proceed to the hospital immediately or call emergency services.',
          [{ text: 'Understood', style: 'destructive' }]
        );
      } else {
        successNotification();
      }
    } catch (error: unknown) {
      Alert.alert(
        'Submission Failed',
        getApiErrorMessage(error, {
          fallback:
            'Your symptoms could not be submitted. Please try again.',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    if (text.length <= 300) {
      setSymptoms(text);
      setCharCount(text.length);
    }
  };

  const handleReturnToAppointment = () => {
    mediumTap();

    /*
     * Always return to the appointment screen explicitly. Using router.back()
     * inside a tab navigator can return to the Home tab instead of the screen
     * that opened the symptom assessment.
     */
    router.replace({
      pathname: '/(patient)/appointments',
      params: { resumeBooking: '1' },
    });
  };

  const baseSeverityConfig = result
    ? SEVERITY_CONFIG[result.severityLabel] || SEVERITY_CONFIG.MILD
    : null;
  const severityBackgrounds: Record<string, string> = {
    MILD: colors.severityMildBg,
    MODERATE: colors.severityModerateBg,
    SEVERE: colors.severitySevereBg,
    EMERGENCY: colors.severityCriticalBg,
  };
  const severityConfig = baseSeverityConfig
    ? {
        ...baseSeverityConfig,
        bg: severityBackgrounds[result.severityLabel] ?? colors.severityMildBg,
      }
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Symptom Check</Text>
        <Text style={styles.headerSubtitle}>AI-powered medical triage</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!result ? (
            <>
              <Text style={styles.sectionTitle}>Describe Your Symptoms</Text>
              <Text style={styles.sectionSubtitle}>
                Be as specific as possible. Include duration, severity, and any related symptoms.
              </Text>

              <View style={styles.inputCard}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. I have a severe headache, fever of 39°C, and difficulty breathing for the past 2 days..."
                  placeholderTextColor={colors.textDisabled}
                  value={symptoms}
                  onChangeText={handleTextChange}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{charCount}/300</Text>
              </View>

              <Text style={styles.severitySectionTitle}>
                How severe are your symptoms?
              </Text>
              <Text style={styles.severitySectionSubtitle}>
                Choose one score. This patient-selected score will be sent with your appointment.
              </Text>

              <View style={styles.severityOptions}>
                {SEVERITY_OPTIONS.map(option => {
                  const selected =
                    selectedSeverity === option.score;
                  const optionConfig =
                    SEVERITY_CONFIG[option.label];

                  return (
                    <TouchableOpacity
                      key={option.score}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={[
                        styles.severityOption,
                        {
                          borderColor: selected
                            ? optionConfig.color
                            : colors.border,
                          backgroundColor: selected
                            ? severityBackgrounds[option.label]
                            : colors.surface,
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        mediumTap();
                        setSelectedSeverity(option.score);
                      }}
                    >
                      <View
                        style={[
                          styles.severityNumber,
                          {
                            backgroundColor: selected
                              ? optionConfig.color
                              : colors.surfaceSecondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityNumberText,
                            {
                              color: selected
                                ? colors.white
                                : colors.textPrimary,
                            },
                          ]}
                        >
                          {option.score}
                        </Text>
                      </View>

                      <View style={styles.severityOptionContent}>
                        <View style={styles.severityOptionTitleRow}>
                          <Ionicons
                            name={option.icon as any}
                            size={18}
                            color={optionConfig.color}
                          />
                          <Text
                            style={[
                              styles.severityOptionTitle,
                              {
                                color: selected
                                  ? optionConfig.color
                                  : colors.textPrimary,
                              },
                            ]}
                          >
                            {option.title}
                          </Text>
                        </View>

                        <Text style={styles.severityOptionDescription}>
                          {option.description}
                        </Text>
                      </View>

                      <Ionicons
                        name={
                          selected
                            ? 'radio-button-on'
                            : 'radio-button-off'
                        }
                        size={20}
                        color={
                          selected
                            ? optionConfig.color
                            : colors.textDisabled
                        }
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sample Symptoms */}
              <Text style={styles.samplesTitle}>Quick Select</Text>
              <View style={styles.samplesGrid}>
                {SAMPLE_SYMPTOMS.map((sample, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.sampleChip}
                    onPress={() => { setSymptoms(sample); setCharCount(sample.length); }}
                  >
                    <Text style={styles.sampleChipText}>{sample}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="pulse-outline" size={20} color={colors.white} />
                    <Text style={styles.submitButtonText}>Submit Symptoms</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {result.isEmergency && (
                <View style={styles.emergencyBanner}>
                  <Ionicons name="warning-outline" size={20} color={colors.white} />
                  <Text style={styles.emergencyText}>EMERGENCY — Seek immediate help</Text>
                </View>
              )}

              {/* Severity Card */}
              <View style={[styles.severityCard, { backgroundColor: severityConfig?.bg }]}>
                <View style={styles.severityHeader}>
                  <Ionicons
                    name={severityConfig?.icon as any}
                    size={32}
                    color={severityConfig?.color}
                  />
                  <View style={styles.severityInfo}>
                    <Text style={styles.severityTitle}>Patient-selected severity</Text>
                    <Text style={[styles.severityLabel, { color: severityConfig?.color }]}>
                      {result.severityLabel}
                    </Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: severityConfig?.color }]}>
<Text style={styles.scoreText}>
  {result.severityScore}/4
</Text>                  </View>
                </View>

                {/* Score Bar */}
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, (Number(result.severityScore) / 4) * 100))}%` as any,
                        backgroundColor: severityConfig?.color,
                      }
                    ]}
                  />
                </View>
              </View>

              {/* First Aid */}
              {result.isEmergency && result.firstAidContent ? (
                <View style={styles.firstAidCard}>
                  <View style={styles.firstAidHeader}>
                    <Ionicons name="medkit-outline" size={18} color={colors.danger} />
                    <Text style={styles.firstAidTitle}>First Aid Instructions</Text>
                  </View>
                  <Text style={styles.firstAidText}>{result.firstAidContent}</Text>
                </View>
              ) : null}

              {/* Symptoms Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Reported Symptoms</Text>
                <Text style={styles.summaryText}>{result.symptoms}</Text>
              </View>

              {/* Actions */}
              <TouchableOpacity
                style={styles.bookButton}
                onPress={handleReturnToAppointment}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.bookButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.white} />
                  <Text style={styles.bookButtonText}>Use for Appointment</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setResult(null);
                  setSymptoms('');
                  setCharCount(0);
                  setSelectedSeverity(null);
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.retryButtonText}>Check Again</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.headerGradientStart },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  inputCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  input: { fontSize: 15, color: colors.textPrimary, minHeight: 140, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: colors.textDisabled, textAlign: 'right', marginTop: 8 },
  severitySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  severitySectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  severityOptions: {
    gap: 10,
    marginBottom: 22,
  },
  severityOption: {
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  severityNumber: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityNumberText: {
    fontSize: 16,
    fontWeight: '800',
  },
  severityOptionContent: {
    flex: 1,
  },
  severityOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  severityOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  severityOptionDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  samplesTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },
  samplesGrid: { gap: 8, marginBottom: 24 },
  sampleChip: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  sampleChipText: { fontSize: 13, color: colors.textSecondary },
  submitButton: { minHeight: 52, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
  submitButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  emergencyBanner: { backgroundColor: colors.severityCriticalBg, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  emergencyText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  severityCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  severityHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  severityInfo: { flex: 1 },
  severityTitle: { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  severityLabel: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  scoreText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  scoreBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: 8, borderRadius: 4 },
  firstAidCard: { backgroundColor: colors.dangerLight, borderRadius: 14, padding: 16, marginBottom: 16 },
  firstAidHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  firstAidTitle: { fontSize: 14, fontWeight: '700', color: colors.danger },
  firstAidText: { fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
  summaryCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  summaryTitle: { fontSize: 12, color: colors.textDisabled, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  summaryText: { fontSize: 14, color: colors.textPrimary, lineHeight: 21 },
  bookButton: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  bookButtonGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bookButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  retryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  retryButtonText: { color: colors.textSecondary, fontSize: 14 },
});