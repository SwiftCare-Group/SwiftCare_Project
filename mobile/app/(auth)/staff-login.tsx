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

export default function StaffLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/staff-login', { email, password });
      const { accessToken, role } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);

      if (role === 'DOCTOR') {
        router.replace('/(doctor)/queue');
      } else if (role === 'PHARMACIST') {
        router.replace('/(pharmacist)/dispense');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Login failed. Try again.');
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
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="medical-outline" size={32} color={Colors.white} />
          </View>
          <Text style={styles.appName}>Staff Login</Text>
          <Text style={styles.appTagline}>For doctors and pharmacists only</Text>
        </View>
      </LinearGradient>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.label}>Staff Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={Colors.textDisabled} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your staff email"
                placeholderTextColor={Colors.textDisabled}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textDisabled} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textDisabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textDisabled}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.back()}
            >
              <Text style={styles.linkText}>
                Patient?{' '}
                <Text style={styles.linkTextBold}>Patient Login →</Text>
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
  container: { flexGrow: 1, backgroundColor: Colors.background },
  headerGradient: { paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20 },
  backButton: { marginBottom: 16 },
  logoContainer: { alignItems: 'center' },
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  appName: { fontSize: 24, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  appTagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  formContainer: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, padding: 24, flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, marginTop: 14 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12 },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  eyeButton: { paddingHorizontal: 14 },
  loginButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  loginButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  linkButton: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  linkText: { fontSize: 14, color: Colors.textSecondary },
  linkTextBold: { color: Colors.primary, fontWeight: '700' },
});