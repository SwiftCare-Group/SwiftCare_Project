import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { useTheme, type AppColors } from '../../context/ThemeContext';
import SwiftCareLogo from '../../components/branding/SwiftCareLogo';
import { getApiErrorMessage } from '../../utils/errors';

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async () => {
    if (!email) {
      Alert.alert('Email unavailable', 'Return to registration and try again.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Check the code', 'Enter the six-digit code sent to your email.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { email, code });
      Alert.alert('Email verified', 'Your account is ready. You can now sign in.', [
        { text: 'Continue', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error: unknown) {
      Alert.alert('Verification failed', getApiErrorMessage(error, {
        fallback: 'The code is invalid or expired. Request a new code and try again.',
        unauthorized: 'The code is invalid or expired.',
        validation: 'Enter the six-digit code sent to your email.',
      }));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setCooldown(60);
      Alert.alert('Code sent', 'Check your inbox and spam folder for the new code.');
    } catch (error: unknown) {
      Alert.alert('Could not resend', getApiErrorMessage(error, {
        fallback: 'Please check your connection and try again.',
      }));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
        <SwiftCareLogo size={86} />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>We sent a six-digit code to</Text>
        <Text style={styles.email}>{email || 'your email address'}</Text>
      </LinearGradient>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <View style={styles.iconCircle}><Ionicons name="mail-open-outline" size={28} color={colors.primary} /></View>
          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.textDisabled}
            editable={!loading}
            onSubmitEditing={() => void verify()}
          />
          <TouchableOpacity style={[styles.primaryButton, loading && styles.disabled]} onPress={() => void verify()} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Verify email</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.resendButton} onPress={() => void resend()} disabled={cooldown > 0 || resending}>
            <Text style={[styles.resendText, cooldown > 0 && styles.muted]}>
              {resending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginButton}>
            <Text style={styles.loginText}>Return to sign in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.headerGradientStart },
  header: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48 },
  title: { color: colors.white, fontSize: 25, fontWeight: '800', marginTop: 12 },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 14, marginTop: 8 },
  email: { color: colors.white, fontSize: 14, fontWeight: '700', marginTop: 3 },
  body: { flex: 1, backgroundColor: colors.background },
  card: { margin: 22, marginTop: -22, padding: 24, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  iconCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  label: { alignSelf: 'flex-start', color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 24, marginBottom: 9 },
  codeInput: { width: '100%', borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.background, color: colors.textPrimary, fontSize: 27, fontWeight: '700', letterSpacing: 10, textAlign: 'center', paddingVertical: 15 },
  primaryButton: { width: '100%', minHeight: 52, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  resendButton: { padding: 14 },
  resendText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  muted: { color: colors.textDisabled },
  loginButton: { paddingVertical: 8 },
  loginText: { color: colors.textSecondary, fontSize: 14 },
});
