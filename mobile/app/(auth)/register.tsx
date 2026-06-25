import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone || !dateOfBirth || !password) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        phone,
        dateOfBirth,
        password,
      });

      const { accessToken } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);
      router.replace('/(auth)/health-profile');
    } catch (error: any) {
        const message =
            error.response?.data?.message || 
            error.response?.data?.errors ? 
            JSON.stringify(error.response?.data?.errors) : 
            'Registration failed. Try again.';
        Alert.alert('Error', JSON.stringify(error.response?.data) || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
        <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join SwiftCare to manage your healthcare</Text>

        <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.textDisabled}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType='next'
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={Colors.textDisabled}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType='next'
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            placeholderTextColor={Colors.textDisabled}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType='next'
            />

            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textDisabled}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            returnKeyType='next'
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
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
                    size={22}
                    color={Colors.textDisabled}
                />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            >
            {loading ? (
                <ActivityIndicator color={Colors.white} />
            ) : (
                <Text style={styles.buttonText}>Create Account</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
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
  passwordContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 10,
},
passwordInput: {
  flex: 1,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  color: Colors.textPrimary,
},
eyeButton: {
  paddingHorizontal: 14,
  paddingVertical: 14,
},
});