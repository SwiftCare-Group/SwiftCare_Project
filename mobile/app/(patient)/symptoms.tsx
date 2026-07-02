import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

const SEVERITY_COLORS: Record<string, string> = {
  MILD: Colors.severityMild,
  MODERATE: Colors.severityModerate,
  SEVERE: Colors.severitySevere,
  CRITICAL: Colors.severityCriticalBg,
};

const SEVERITY_BG: Record<string, string> = {
  MILD: Colors.severityMildBg,
  MODERATE: Colors.severityModerateBg,
  SEVERE: Colors.severitySevereBg,
  CRITICAL: Colors.severityCriticalBg,
};

export default function SymptomsScreen() {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!symptoms.trim()) {
      Alert.alert('Error', 'Please describe your symptoms');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/symptoms/submit', { symptoms });
      setResult(response.data);

      if (response.data.isEmergency) {
        Alert.alert(
          '🚨 EMERGENCY DETECTED',
          'Your symptoms indicate a potential emergency. Please proceed to the hospital immediately or call emergency services.',
          [{ text: 'OK', style: 'destructive' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit symptoms');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = () => {
    router.push('/(patient)/appointments');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Symptom Check</Text>
      <Text style={styles.subtitle}>
        Describe your symptoms and our AI will assess their severity to prioritise your care.
      </Text>

      {!result ? (
        <View style={styles.form}>
          <Text style={styles.label}>What symptoms are you experiencing?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. I have a severe headache, fever of 39°C, and difficulty breathing..."
            placeholderTextColor={Colors.textDisabled}
            value={symptoms}
            onChangeText={setSymptoms}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Assess Symptoms</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {result.isEmergency && (
            <View style={styles.emergencyBanner}>
              <Text style={styles.emergencyText}>🚨 EMERGENCY — Seek immediate help</Text>
            </View>
          )}

          <View style={[styles.severityCard, { backgroundColor: SEVERITY_BG[result.severityLabel] || Colors.primaryLight }]}>
            <Text style={styles.severityTitle}>Severity Assessment</Text>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[result.severityLabel] || Colors.primary }]}>
              <Text style={styles.severityBadgeText}>{result.severityLabel}</Text>
            </View>
            <Text style={styles.severityScore}>Score: {result.severityScore}/10</Text>
          </View>

          {result.isEmergency && result.firstAidContent ? (
            <View style={styles.firstAidCard}>
              <Text style={styles.firstAidTitle}>First Aid Instructions</Text>
              <Text style={styles.firstAidText}>{result.firstAidContent}</Text>
            </View>
          ) : null}

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.bookButton} onPress={handleBookAppointment}>
              <Text style={styles.bookButtonText}>Book Appointment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => { setResult(null); setSymptoms(''); }}
            >
              <Text style={styles.retryButtonText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 28,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 140,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  resultContainer: {
    gap: 16,
  },
  emergencyBanner: {
    backgroundColor: Colors.severityCriticalBg,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  emergencyText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  severityCard: {
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  severityTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  severityBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
    marginBottom: 10,
  },
  severityBadgeText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  severityScore: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  firstAidCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  firstAidTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  firstAidText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  retryButton: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});