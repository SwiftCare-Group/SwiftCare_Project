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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { goBackOrReplace } from '../utils/navigation';
import { getApiErrorMessage } from '../utils/errors';

type PasswordInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  disabled: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
};

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (loading) {
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing Information', 'Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'The new password must contain at least 8 characters.');
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert('Choose a New Password', 'Your new password must be different from your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The new passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/patients/me/password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => goBackOrReplace(router, '/(patient)/profile'),
          },
        ]
      );
    } catch (error: unknown) {
      Alert.alert(
        'Change Failed',
        getApiErrorMessage(error, {
          fallback: 'Your password could not be changed. Please try again.',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => goBackOrReplace(router, '/(patient)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Change Password</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}> 
            <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}> 
            Create a new secure password for your SwiftCare account.
          </Text>

          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            visible={showCurrent}
            onToggleVisibility={() => setShowCurrent(value => !value)}
            disabled={loading}
            colors={colors}
          />
          <PasswordInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            visible={showNew}
            onToggleVisibility={() => setShowNew(value => !value)}
            disabled={loading}
            colors={colors}
          />
          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            visible={showConfirm}
            onToggleVisibility={() => setShowConfirm(value => !value)}
            disabled={loading}
            colors={colors}
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              loading && styles.buttonDisabled,
            ]}
            disabled={loading}
            onPress={handleChangePassword}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordInput({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisibility,
  disabled,
  colors,
}: PasswordInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={label}
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          editable={!disabled}
          returnKeyType="next"
        />
        <TouchableOpacity
          onPress={onToggleVisibility}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        >
          <Ionicons
            name={visible ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 60,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  description: { textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 25 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputContainer: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 12 },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
