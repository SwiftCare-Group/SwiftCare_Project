import { useTheme, type AppColors } from '../../context/ThemeContext';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../constants/colors";
import { useHaptics } from "../../hooks/useHaptics";
import api, { clearLocalSession } from "../../services/api";
import { homeRouteForRole, normalizeRole } from "../../utils/auth";
import { getApiErrorMessage } from "../../utils/errors";
import SwiftCareLogo from "../../components/branding/SwiftCareLogo";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    mediumTap,
    successNotification,
    errorNotification,
  } = useHaptics();

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    mediumTap();

    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(cleanEmail) || !password) {
      errorNotification();
      Alert.alert(
        'Check your details',
        !cleanEmail || !password
          ? 'Email and password are required.'
          : 'Enter a valid email address.',
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: cleanEmail,
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
      router.replace(homeRouteForRole(role));
    } catch (error: unknown) {
      errorNotification();
      Alert.alert(
        'Login Failed',
        getApiErrorMessage(error, {
          fallback: 'Unable to sign in. Please try again.',
          unauthorized: 'Invalid email or password.',
          forbidden: 'This account is not allowed to sign in here.',
          notFound: 'The login service could not be found.',
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
      edges={["top"]}
    >
      <LinearGradient
        colors={[
          colors.headerGradientStart,
          colors.headerGradientEnd,
        ]}
        style={styles.headerGradient}
      >
        <View style={styles.brandContainer}>
          <SwiftCareLogo size={92} />

          <Text style={styles.appName}>
            SwiftCare
          </Text>

          <Text style={styles.appTagline}>
            Smart Hospital Queue & Consultation
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>
              Welcome Back
            </Text>

            <Text style={styles.subtitle}>
              Sign in to your patient account
            </Text>

            <Text style={styles.label}>
              Email Address
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={19}
                color={colors.textDisabled}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your email"
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

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
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
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() =>
                  setShowPassword(
                    current => !current,
                  )
                }
                disabled={loading}
                accessibilityLabel={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={21}
                  color={colors.textDisabled}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() =>
                router.push(
                  "/(auth)/forgot-password",
                )
              }
              disabled={loading}
            >
              <Text
                style={styles.forgotPasswordText}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.white}
                />
              ) : (
                <Text
                  style={styles.loginButtonText}
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() =>
                router.replace(
                  "/(auth)/register",
                )
              }
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Don&apos;t have an account?{" "}
                <Text
                  style={styles.linkTextBold}
                >
                  Create one
                </Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />

              <Text style={styles.dividerText}>
                OR
              </Text>

              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.staffButton}
              onPress={() =>
                router.push(
                  "/(auth)/staff-login",
                )
              }
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons
                name="people-outline"
                size={19}
                color={colors.primary}
              />

              <Text style={styles.staffButtonText}>
                Doctor / Pharmacist Login
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
    paddingTop: 20,
    paddingBottom: 42,
    paddingHorizontal: 24,
    alignItems: "center",
  },

  brandContainer: {
    alignItems: "center",
  },

  headerLogo: {
    width: 104,
    height: 104,
    borderRadius: 26,
    marginBottom: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  appName: {
    fontSize: 29,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 5,
  },

  appTagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
  },

  formContainer: {
    flex: 1,
    marginTop: -22,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 36,
    backgroundColor: colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },

  inputIcon: {
    marginLeft: 14,
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
    paddingVertical: 14,
  },

  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: 12,
    paddingVertical: 4,
  },

  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },

  loginButton: {
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: 22,
    paddingVertical: 15,
  },

  loginButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  linkButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },

  linkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  linkTextBold: {
    color: colors.primary,
    fontWeight: "700",
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textDisabled,
  },

  staffButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  staffButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
