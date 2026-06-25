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

export default function HealthProfileScreen() {
  const router = useRouter();

  const [conditions, setConditions] = useState('');
  const [chronicIllnesses, setChronicIllnesses] = useState('');
  const [knownDiagnoses, setKnownDiagnoses] = useState('');
  const [loading, setLoading] = useState(false);

  const parseList = (value: string): string[] => {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/profile/health', {
        conditions: parseList(conditions),
        chronicIllnesses: parseList(chronicIllnesses),
        knownDiagnoses: parseList(knownDiagnoses),
      });

      router.replace('/(patient)/profile');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to save health profile.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(patient)/profile');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Health Profile</Text>
      <Text style={styles.subtitle}>
        Help us understand your health better. This information is used to
        accurately assess your symptoms. You can update it anytime.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Enter multiple items separated by commas. Leave blank if not applicable.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Existing Conditions</Text>
        <Text style={styles.hint}>e.g. Asthma, High Blood Pressure</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter conditions separated by commas"
          placeholderTextColor={Colors.textDisabled}
          value={conditions}
          onChangeText={setConditions}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Chronic Illnesses</Text>
        <Text style={styles.hint}>e.g. Diabetes, Sickle Cell</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter chronic illnesses separated by commas"
          placeholderTextColor={Colors.textDisabled}
          value={chronicIllnesses}
          onChangeText={setChronicIllnesses}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Known Diagnoses</Text>
        <Text style={styles.hint}>e.g. Hypertension, Arthritis</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter known diagnoses separated by commas"
          placeholderTextColor={Colors.textDisabled}
          value={knownDiagnoses}
          onChangeText={setKnownDiagnoses}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Save Health Profile</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 20,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
    marginTop: 16,
  },
  hint: {
    fontSize: 12,
    color: Colors.textDisabled,
    marginBottom: 6,
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
    height: 90,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});