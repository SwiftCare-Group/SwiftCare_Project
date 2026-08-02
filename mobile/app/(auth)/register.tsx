import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api, { clearLocalSession } from '../../services/api';
import { Colors } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';
import SwiftCareLogo from '../../components/branding/SwiftCareLogo';
import { normalizeRole } from '../../utils/auth';
import { getApiErrorMessage } from '../../utils/errors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidPastDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { mediumTap, successNotification, errorNotification } = useHaptics();


  const handleRegister = async () => {
    if (loading) {
      return;
    }

    mediumTap();

    const cleanedName = name.trim();
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedPhone = phone.trim();
    const cleanedDateOfBirth = dateOfBirth.trim();
    const phoneDigits = cleanedPhone.replace(/\D/g, '');

    let validationMessage: string | null = null;

    if (cleanedName.length < 2) {
      validationMessage = 'Enter your full name.';
    } else if (!EMAIL_PATTERN.test(cleanedEmail)) {
      validationMessage = 'Enter a valid email address.';
    } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      validationMessage = 'Enter a valid phone number.';
    } else if (!isValidPastDate(cleanedDateOfBirth)) {
      validationMessage = 'Enter a valid past date in YYYY-MM-DD format.';
    } else if (password.length < 8) {
      validationMessage = 'Use a password with at least 8 characters.';
    }

    if (validationMessage) {
      errorNotification();
      Alert.alert('Check your details', validationMessage);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name: cleanedName,
        email: cleanedEmail,
        phone: cleanedPhone,
        dateOfBirth: cleanedDateOfBirth,
        password,
      });

      const accessToken = response.data?.accessToken;
      const refreshToken = response.data?.refreshToken;
      const role = normalizeRole(response.data?.role) ?? 'PATIENT';

      if (typeof accessToken !== 'string' || !accessToken.trim()) {
        throw new Error('The server did not return a valid access token.');
      }

      await clearLocalSession();

      const storageEntries: [string, string][] = [
        ['accessToken', accessToken],
        ['userRole', role],
      ];

      if (typeof refreshToken === 'string' && refreshToken.trim()) {
        storageEntries.push(['refreshToken', refreshToken]);
      }

      await AsyncStorage.multiSet(storageEntries);
      successNotification();
      router.replace('/(auth)/health-profile');
    } catch (error: unknown) {
      errorNotification();
      Alert.alert(
        'Registration Failed',
        getApiErrorMessage(error, {
          fallback: 'Registration failed. Please try again.',
          conflict: 'An account with this email or phone number already exists.',
          validation: 'Please review the registration details and try again.',
        }),
      );
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
      <TouchableOpacity
  style={styles.backButton}
  onPress={() => router.replace('/(auth)/login')}
>
          <Ionicons name="arrow-back-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
<View style={styles.logoContainer}>
  <SwiftCareLogo size={92} />
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.appTagline}>Join SwiftCare to manage your healthcare</Text>
        </View>
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
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={Colors.textDisabled} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textDisabled}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={Colors.textDisabled} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textDisabled}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={18} color={Colors.textDisabled} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor={Colors.textDisabled}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Date of Birth</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={18} color={Colors.textDisabled} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textDisabled}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textDisabled} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                placeholderTextColor={Colors.textDisabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={() => void handleRegister()}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(current => !current)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textDisabled}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.linkText}>
                Already have an account?{' '}
                <Text style={styles.linkTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flexGrow: 1, backgroundColor: Colors.background, },
  headerGradient: { paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20 },
  backButton: { marginBottom: 16 },
  logoContainer: { alignItems: 'center' },
  appName: { fontSize: 24, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  appTagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  formContainer: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, padding: 24, flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, marginTop: 14 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12 },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  eyeButton: { paddingHorizontal: 14 },
  registerButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  registerButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  headerLogo: {
    width: 104,
    height: 104,
    borderRadius: 26,
    marginBottom: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButton: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  linkText: { fontSize: 14, color: Colors.textSecondary },
  linkTextBold: { color: Colors.primary, fontWeight: '700' },
});
