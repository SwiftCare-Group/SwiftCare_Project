import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import SwiftCareLogo from '../components/branding/SwiftCareLogo';
import { Colors } from '../constants/colors';
import api from '../services/api';
import { getApiErrorMessage } from '../utils/errors';
import { goBackOrReplace } from '../utils/navigation';

const singleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const token = useMemo(() => singleParam(params.token)?.trim() ?? '', [params.token]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) {
      return;
    }

    if (!token) {
      Alert.alert(
        'Invalid reset link',
        'This password reset link does not contain a valid token. Request a new link.'
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak password', 'Use at least 8 characters for your new password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'The new passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });

      Alert.alert(
        'Password reset complete',
        'You can now sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: unknown) {
      Alert.alert(
        'Unable to reset password',
        getApiErrorMessage(error, {
          fallback: 'The reset link may have expired. Request a new password reset email.',
          validation: 'The reset token or password is invalid.',
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => goBackOrReplace(router, '/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Return to login"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.form}>
            <SwiftCareLogo size={88} />
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Choose a secure password for your SwiftCare account.
            </Text>

            {!token ? (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={20} color={Colors.danger} />
                <Text style={styles.warningText}>
                  This link is missing its reset token. Request a new password reset email.
                </Text>
              </View>
            ) : null}

            <PasswordField
              label="New password"
              value={password}
              onChangeText={setPassword}
              visible={showPassword}
              onToggle={() => setShowPassword(value => !value)}
              editable={!submitting}
            />
            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(value => !value)}
              editable={!submitting}
            />

            <TouchableOpacity
              style={[styles.submitButton, (submitting || !token) && styles.disabled]}
              disabled={submitting || !token}
              onPress={() => void submit()}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.requestLink}
              onPress={() => router.replace('/(auth)/forgot-password')}
            >
              <Text style={styles.requestLinkText}>Request a new reset link</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggle,
  editable,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  editable: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={19} color={Colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
          placeholder="At least 8 characters"
          placeholderTextColor={Colors.textDisabled}
          textContentType="newPassword"
        />
        <TouchableOpacity onPress={onToggle} disabled={!editable}>
          <Ionicons
            name={visible ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 18 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  form: { flex: 1, justifyContent: 'center', paddingBottom: 50 },
  title: {
    marginTop: 22,
    fontSize: 27,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 26,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningText: { flex: 1, color: Colors.textPrimary, fontSize: 12, lineHeight: 18 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 7 },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 12 },
  submitButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  requestLink: { alignItems: 'center', marginTop: 20, padding: 8 },
  requestLinkText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
