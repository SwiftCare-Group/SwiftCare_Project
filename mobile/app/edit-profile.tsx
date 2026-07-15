import { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

type PatientProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: string;
  role: string;
  createdAt: string;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [profile, setProfile] =
    useState<PatientProfile | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/patients/me');

      const patient = response.data as PatientProfile;

      setProfile(patient);
      setName(patient.name || '');
      setPhone(patient.phone || '');
    } catch (error: any) {
      console.error(
        'Failed to load profile:',
        error.response?.data || error.message
      );

      Alert.alert(
        'Profile Error',
        'Your profile could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert(
        'Name Required',
        'Please enter your full name.'
      );

      return false;
    }

    if (!phone.trim()) {
      Alert.alert(
        'Phone Required',
        'Please enter your phone number.'
      );

      return false;
    }

    if (phone.trim().length < 10) {
      Alert.alert(
        'Invalid Phone',
        'Please enter a valid phone number.'
      );

      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const response = await api.put('/patients/me', {
        name: name.trim(),
        phone: phone.trim(),
      });

      setProfile(response.data);

      Alert.alert(
        'Profile Updated',
        'Your profile information has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error(
        'Failed to update profile:',
        error.response?.data || error.message
      );

      Alert.alert(
        'Update Failed',
        error.response?.data?.message ||
          'Your profile could not be updated.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.surface,
        },
      ]}
      edges={['top']}
    >
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
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={25}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          Edit Profile
        </Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <ScrollView
          style={[
            styles.container,
            {
              backgroundColor: colors.background,
            },
          ]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  {
                    color: colors.primary,
                  },
                ]}
              >
                {name.trim().charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>

            <Text
              style={[
                styles.profileName,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              {name || 'SwiftCare User'}
            </Text>

            <Text
              style={[
                styles.profileEmail,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              {profile?.email}
            </Text>
          </View>

          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Personal Information
          </Text>

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.inputLabel,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Full Name
            </Text>

            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor:
                    colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={19}
                color={colors.textSecondary}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="words"
              />
            </View>

            <Text
              style={[
                styles.inputLabel,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Email Address
            </Text>

            <View
              style={[
                styles.inputContainer,
                styles.disabledInput,
                {
                  backgroundColor:
                    colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={19}
                color={colors.textDisabled}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textDisabled,
                  },
                ]}
                value={profile?.email || ''}
                editable={false}
              />

              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={colors.textDisabled}
              />
            </View>

            <Text
              style={[
                styles.helperText,
                {
                  color: colors.textDisabled,
                },
              ]}
            >
              Email cannot be changed because it is used
              for login.
            </Text>

            <Text
              style={[
                styles.inputLabel,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Phone Number
            </Text>

            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor:
                    colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={19}
                color={colors.textSecondary}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.primary,
              },
              saving && styles.disabledButton,
            ]}
            activeOpacity={0.8}
            disabled={saving}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color={colors.white}
              />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={19}
                  color={colors.white}
                />

                <Text style={styles.saveButtonText}>
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    height: 60,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },

  headerPlaceholder: {
    width: 40,
  },

  profileCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 22,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  avatarText: {
    fontSize: 30,
    fontWeight: '800',
  },

  profileName: {
    fontSize: 17,
    fontWeight: '700',
  },

  profileEmail: {
    fontSize: 13,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 9,
  },

  formCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },

  inputContainer: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  disabledInput: {
    opacity: 0.8,
  },

  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },

  helperText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },

  saveButton: {
    minHeight: 50,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.6,
  },
});