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
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function HealthProfileScreen() {
  const router = useRouter();
  const [conditions, setConditions] = useState('');
  const [chronicIllnesses, setChronicIllnesses] = useState('');
  const [knownDiagnoses, setKnownDiagnoses] = useState('');
  const [loading, setLoading] = useState(false);

  const parseList = (value: string): string[] =>
    value.split(',').map(item => item.trim()).filter(item => item.length > 0);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/profile/health', {
        conditions: parseList(conditions),
        chronicIllnesses: parseList(chronicIllnesses),
        knownDiagnoses: parseList(knownDiagnoses),
      });
      router.replace('/(patient)/home');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save health profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
        style={styles.headerGradient}
      >
        <View style={styles.headerIcon}>
          <Ionicons name="heart-outline" size={32} color={Colors.white} />
        </View>
        <Text style={styles.headerTitle}>Health Profile</Text>
        <Text style={styles.headerSubtitle}>
          Help us understand your health better for accurate symptom assessment
        </Text>
      </LinearGradient>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoText}>
                Enter multiple items separated by commas. Leave blank if not applicable.
              </Text>
            </View>

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
              textAlignVertical="top"
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
              textAlignVertical="top"
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
                <Text style={styles.buttonText}>Save Health Profile</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => router.replace('/(patient)/home')}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flexGrow: 1, backgroundColor: Colors.background },
  headerGradient: { paddingTop: 24, paddingBottom: 32, paddingHorizontal: 20, alignItems: 'center' },
  headerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 },
  formContainer: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, padding: 24, flex: 1 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: 10, padding: 12, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 13, color: Colors.primary, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4, marginTop: 16 },
  hint: { fontSize: 12, color: Colors.textDisabled, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  textArea: { height: 90, textAlignVertical: 'top' },
  button: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  skipButton: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  skipText: { fontSize: 14, color: Colors.textSecondary },
});