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

import api from '../../services/api';
import { Colors } from '../../constants/colors';
import SwiftCareLogo from '../../components/branding/SwiftCareLogo';

const getErrorMessage = (
  error: any
): string => {
  const responseData = error?.response?.data;

  if (typeof responseData?.message === 'string') {
    return responseData.message;
  }

  if (typeof responseData?.error === 'string') {
    return responseData.error;
  }

  if (typeof responseData === 'string') {
    return responseData;
  }

  if (error?.code === 'ECONNABORTED') {
    return 'The login request took too long. Please check your connection and try again.';
  }

  if (!error?.response) {
    return 'The server could not be reached. Check that the backend is running and your phone is connected to the same network.';
  }

  if (error?.response?.status === 401) {
    return 'Invalid staff email or password.';
  }

  if (error?.response?.status === 403) {
    return 'You do not have permission to access the staff portal.';
  }

  return 'Unable to sign in. Please try again.';
};

export default function StaffLoginScreen() {
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

    const cleanedEmail = email
      .trim()
      .toLowerCase();

    if (!cleanedEmail || !password) {
      Alert.alert(
        'Missing information',
        'Email and password are required.'
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
        },
        {
          timeout: 15000,
        }
      );

      const accessToken =
        response.data?.accessToken ??
        response.data?.token;

      const role = response.data?.role;
      const refreshToken = response.data?.refreshToken;

      if (!accessToken) {
        throw new Error(
          'The server did not return an access token.'
        );
      }

      if (
        role !== 'DOCTOR' &&
        role !== 'PHARMACIST' &&
        role !== 'ADMIN' &&
        role !== 'LAB_TECHNICIAN'
      ) {
        throw new Error(
          'This account is not authorized for staff access.'
        );
      }

      const storageEntries: [string, string][] = [
        ['accessToken', accessToken],
        ['userRole', role],
      ];

      if (typeof refreshToken === 'string' && refreshToken) {
        storageEntries.push(['refreshToken', refreshToken]);
      }

      await AsyncStorage.multiSet(storageEntries);

      if (role === 'DOCTOR') {
        router.replace('/(doctor)/queue' as any);
        return;
      }

      if (role === 'PHARMACIST') {
        router.replace('/(pharmacist)/dispense' as any);
        return;
      }

      if (role === 'ADMIN') {
        router.replace('/(admin)/dashboard' as any);
        return;
      }

      router.replace('/(lab)/dashboard' as any);
    } catch (error: any) {
      await AsyncStorage.multiRemove([
        'accessToken',
        'userRole',
        'refreshToken',
      ]);

      Alert.alert(
        'Login failed',
        getErrorMessage(error)
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
          Colors.headerGradientStart,
          Colors.headerGradientEnd,
        ]}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(auth)/login');
            }
          }}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back-outline"
            size={22}
            color={Colors.white}
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
                color={Colors.textDisabled}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your staff email"
                placeholderTextColor={
                  Colors.textDisabled
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
                color={Colors.textDisabled}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={
                  Colors.textDisabled
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
                  color={Colors.textDisabled}
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
                    color={Colors.white}
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
              onPress={() => router.back()}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      Colors.headerGradientStart,
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
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
    color: Colors.white,
    marginBottom: 4,
  },

  appTagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },

  formContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 14,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textPrimary,
  },

  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  loginButton: {
    minHeight: 52,
    backgroundColor: Colors.primary,
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
    color: Colors.white,
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
    color: Colors.textSecondary,
  },

  linkTextBold: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
