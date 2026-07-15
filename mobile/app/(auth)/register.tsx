import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
    mediumTap();
    if (!name || !email || !phone || !dateOfBirth || !password) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    setLoading(true);
    try {
      successNotification();
      const response = await api.post('/auth/register', {
        name, email, phone, dateOfBirth, password,
      });
      const { accessToken } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);
      router.replace('/(auth)/health-profile');
    } catch (error: any) {
      errorNotification();
      const message = error.response?.data?.message || 'Registration failed. Try again.';
      Alert.alert('Error', message);
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
            <Ionicons name="person-add-outline" size={32} color={Colors.white} />
          </View>
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
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
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
  linkButton: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  linkText: { fontSize: 14, color: Colors.textSecondary },
  linkTextBold: { color: Colors.primary, fontWeight: '700' },
});