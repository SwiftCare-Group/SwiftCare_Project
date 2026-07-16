import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useHaptics } from '../../hooks/useHaptics';
import { showToast } from '../../utils/toast';


import { Colors } from "../../constants/colors";
import { useHaptics } from "../../hooks/useHaptics";
import api from "../../services/api";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { mediumTap, successNotification, errorNotification } =
    useHaptics();

  const handleLogin = async () => {
    mediumTap();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      errorNotification();
      Alert.alert("Missing details", "Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: cleanEmail,
        password,
      });

      const { accessToken, role } = response.data;

      if (!accessToken) {
        throw new Error("No access token was returned by the server.");
      }

      await AsyncStorage.setItem("accessToken", accessToken);

      successNotification();

      if (role === "ADMIN") {
        router.replace("/(admin)/dashboard");
      } else if (role === "DOCTOR") {
        router.replace("/(doctor)/queue");
      } else if (role === "PHARMACIST") {
        router.replace("/(pharmacist)/dispense");
      } else {
        router.replace("/(patient)/home");
      }
    } catch (error: any) {
      errorNotification();
      showToast.error(error.response?.data?.message || 'Login failed. Try again.');

      console.log(
        "Login error:",
        error.response?.data ?? error.message
      );

      Alert.alert(
        "Login failed",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to sign in. Check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <LinearGradient
        colors={[
          Colors.headerGradientStart,
          Colors.headerGradientEnd,
        ]}
        style={styles.headerGradient}
      >
        <View style={styles.brandContainer}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.headerLogo}
            resizeMode="cover"
          />

          <Text style={styles.appName}>SwiftCare</Text>

          <Text style={styles.appTagline}>
            Smart Hospital Queue & Consultation
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>

            <Text style={styles.subtitle}>
              Sign in to your patient account
            </Text>

            <Text style={styles.label}>Email Address</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={19}
                color={Colors.textDisabled}
                style={styles.inputIcon}
              />

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

            <Text style={styles.label}>Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={Colors.textDisabled}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textDisabled}
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
                onPress={() => setShowPassword((current) => !current)}
                disabled={loading}
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={21}
                  color={Colors.textDisabled}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() =>
                router.push("/(auth)/forgot-password")
              }
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>
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
                  color={Colors.white}
                />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() =>
                router.replace("/(auth)/register")
              }
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Don&apos;t have an account?{" "}
                <Text style={styles.linkTextBold}>
                  Create one
                </Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />

              <Text style={styles.dividerText}>OR</Text>

              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.staffButton}
              onPress={() =>
                router.push("/(auth)/staff-login")
              }
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons
                name="people-outline"
                size={19}
                color={Colors.primary}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.headerGradientStart,
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
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
  },

  appName: {
    fontSize: 29,
    fontWeight: "800",
    color: Colors.white,
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
    backgroundColor: Colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textPrimary,
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
    color: Colors.primary,
  },

  loginButton: {
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginTop: 22,
    paddingVertical: 15,
  },

  loginButtonText: {
    color: Colors.white,
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
    color: Colors.textSecondary,
  },

  linkTextBold: {
    color: Colors.primary,
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
    backgroundColor: Colors.border,
  },

  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textDisabled,
  },

  staffButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  staffButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});