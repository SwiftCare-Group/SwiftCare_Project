import { useTheme, type AppColors } from '../../context/ThemeContext';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api, { clearLocalSession } from '../../services/api';
import { Colors } from '../../constants/colors';
import SwiftCareLogo from '../../components/branding/SwiftCareLogo';
import { homeRouteForRole, isStaffRole, normalizeRole } from '../../utils/auth';
import { getApiErrorMessage } from '../../utils/errors';
import { goBackOrReplace } from '../../utils/navigation';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StaffLoginScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');
  const [loading, setLoading] =
    useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    const cleanedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(cleanedEmail) || !password) {
      Alert.alert(
        'Check your details',
        !cleanedEmail || !password
          ? 'Email and password are required.'
          : 'Enter a valid staff email address.',
      );
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        '/auth/staff/login',
        {
          email: cleanedEmail,
          password,
        }
      );

      const accessToken =
        response.data?.accessToken ?? response.data?.token;
      const role = normalizeRole(response.data?.role);
      const refreshToken = response.data?.refreshToken;

      if (typeof accessToken !== 'string' || !accessToken.trim()) {
        throw new Error('The server did not return a valid access token.');
      }

      if (!role || !isStaffRole(role)) {
        throw new Error('This account is not authorized for staff access.');
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
      router.replace(homeRouteForRole(role));
    } catch (error: unknown) {
      await clearLocalSession();
      Alert.alert(
        'Login failed',
        getApiErrorMessage(error, {
          fallback: 'Unable to sign in. Please try again.',
          unauthorized: 'Invalid staff email or password.',
          forbidden: 'You do not have permission to access the staff portal.',
          validation: 'Please check the email and password you entered.',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <LinearGradient
        colors={[
          colors.headerGradientStart,
          colors.headerGradientEnd,
        ]}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => goBackOrReplace(router, '/(auth)/login')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back-outline"
            size={22}
            color={colors.white}
          />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <SwiftCareLogo size={92} />

          <Text style={styles.appName}>
            Staff Login
          </Text>

          <Text style={styles.appTagline}>
            For authorized hospital staff
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.container
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <Text style={styles.label}>
              Staff Email
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.textDisabled}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your staff email"
                placeholderTextColor={
                  colors.textDisabled
                }
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>
              Password
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.textDisabled}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={
                  colors.textDisabled
                }
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() =>
                  setShowPassword(
                    current => !current
                  )
                }
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={20}
                  color={colors.textDisabled}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading &&
                  styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View
                  style={
                    styles.loadingButtonContent
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color={colors.white}
                  />

                  <Text
                    style={
                      styles.loginButtonText
                    }
                  >
                    Signing in...
                  </Text>
                </View>
              ) : (
                <Text
                  style={
                    styles.loginButtonText
                  }
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace('/(auth)/login')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.linkText}>
                Patient?{' '}
                <Text
                  style={styles.linkTextBold}
                >
                  Patient Login →
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      colors.headerGradientStart,
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },

  headerGradient: {
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    marginBottom: 16,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:
      'rgba(255,255,255,0.14)',
  },

  logoContainer: {
    alignItems: 'center',
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor:
      'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },

  appTagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },

  formContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 14,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },

  inputIcon: {
    paddingLeft: 14,
  },

  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },

  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  loginButton: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },

  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  loginButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  linkButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },

  linkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  linkTextBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});
