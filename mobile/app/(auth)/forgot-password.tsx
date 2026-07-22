import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    const cleanedEmail = email.trim();

    if (!cleanedEmail) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Connect this to the backend forgot-password endpoint later.
       *
       * Example:
       *
       * await api.post("/auth/forgot-password", {
       *   email: cleanedEmail,
       * });
       */

      Alert.alert(
        "Request received",
        "If an account exists for this email, password reset instructions will be sent."
      );
    } catch (error) {
      Alert.alert(
        "Unable to continue",
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0B8FAC" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="lock-reset" size={38} color="#0B8FAC" />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>

          <Text style={styles.subtitle}>
            Enter the email connected to your SwiftCare account.
          </Text>

          <Text style={styles.label}>Email address</Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            placeholderTextColor="#8B98A5"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[
              styles.resetButton,
              loading && styles.resetButtonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.resetButtonText}>
              {loading ? "Please wait..." : "Reset Password"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.loginLinkText}>Return to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 80,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F8F3",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#132238",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#667786",
    textAlign: "center",
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#26394D",
    marginBottom: 8,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#D8E1E8",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#132238",
    marginBottom: 20,
  },
  resetButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#0B8FAC",
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonDisabled: {
    opacity: 0.65,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loginLink: {
    marginTop: 24,
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0B8FAC",
  },
});