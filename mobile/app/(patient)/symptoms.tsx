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
import { useHaptics } from '../../hooks/useHaptics';


const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  MILD: { color: Colors.severityMild, bg: Colors.severityMildBg, icon: 'checkmark-circle-outline' },
  MODERATE: { color: Colors.severityModerate, bg: Colors.severityModerateBg, icon: 'alert-circle-outline' },
  SEVERE: { color: Colors.severitySevere, bg: Colors.severitySevereBg, icon: 'warning-outline' },
  CRITICAL: { color: Colors.white, bg: Colors.severityCriticalBg, icon: 'nuclear-outline' },
};

const SAMPLE_SYMPTOMS = [
  'Mild headache and runny nose',
  'High fever and persistent cough',
  'Severe chest pain and difficulty breathing',
  'Dizziness and nausea',
];

export default function SymptomsScreen() {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [charCount, setCharCount] = useState(0);
  const { mediumTap, successNotification, warningNotification } = useHaptics();


  const handleSubmit = async () => {
    mediumTap();
    if (!symptoms.trim()) {
      Alert.alert('Error', 'Please describe your symptoms');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/symptoms/submit', { symptoms });
      setResult(response.data);
      await AsyncStorage.setItem('lastSeverityScore', String(response.data.severityScore));

      if (response.data.isEmergency) {
        warningNotification();
        Alert.alert(
          '🚨 EMERGENCY DETECTED',
          'Your symptoms indicate a potential emergency. Please proceed to the hospital immediately or call emergency services.',
          [{ text: 'Understood', style: 'destructive' }]
        );
      } else{
        successNotification();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit symptoms');
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

  const severityConfig = result ? SEVERITY_CONFIG[result.severityLabel] || SEVERITY_CONFIG.MILD : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
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
                  placeholderTextColor={Colors.textDisabled}
                  value={symptoms}
                  onChangeText={handleTextChange}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{charCount}/300</Text>
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
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="pulse-outline" size={20} color={Colors.white} />
                    <Text style={styles.submitButtonText}>Assess Symptoms</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {result.isEmergency && (
                <View style={styles.emergencyBanner}>
                  <Ionicons name="warning-outline" size={20} color={Colors.white} />
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
                    <Text style={styles.severityTitle}>Severity Assessment</Text>
                    <Text style={[styles.severityLabel, { color: severityConfig?.color }]}>
                      {result.severityLabel}
                    </Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: severityConfig?.color }]}>
                    <Text style={styles.scoreText}>{result.severityScore}/10</Text>
                  </View>
                </View>

                {/* Score Bar */}
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${result.severityScore * 10}%` as any,
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
                    <Ionicons name="medkit-outline" size={18} color={Colors.danger} />
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
                onPress={() => router.push('/(patient)/appointments')}
              >
                <LinearGradient
                  colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
                  style={styles.bookButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.white} />
                  <Text style={styles.bookButtonText}>Book Appointment</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => { setResult(null); setSymptoms(''); setCharCount(0); }}
              >
                <Ionicons name="refresh-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.retryButtonText}>Check Again</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  inputCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  input: { fontSize: 15, color: Colors.textPrimary, minHeight: 140, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: Colors.textDisabled, textAlign: 'right', marginTop: 8 },
  samplesTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
  samplesGrid: { gap: 8, marginBottom: 24 },
  sampleChip: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border },
  sampleChipText: { fontSize: 13, color: Colors.textSecondary },
  submitButton: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  emergencyBanner: { backgroundColor: Colors.severityCriticalBg, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  emergencyText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  severityCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  severityHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  severityInfo: { flex: 1 },
  severityTitle: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  severityLabel: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  scoreText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  scoreBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: 8, borderRadius: 4 },
  firstAidCard: { backgroundColor: Colors.dangerLight, borderRadius: 14, padding: 16, marginBottom: 16 },
  firstAidHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  firstAidTitle: { fontSize: 14, fontWeight: '700', color: Colors.danger },
  firstAidText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  summaryTitle: { fontSize: 12, color: Colors.textDisabled, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  summaryText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 21 },
  bookButton: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  bookButtonGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bookButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  retryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  retryButtonText: { color: Colors.textSecondary, fontSize: 14 },
});