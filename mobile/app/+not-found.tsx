import { useTheme, type AppColors } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../constants/colors';

const HOME_BY_ROLE: Record<string, string> = {
  PATIENT: '/(patient)/home',
  DOCTOR: '/(doctor)/queue',
  PHARMACIST: '/(pharmacist)/dispense',
  LAB_TECHNICIAN: '/(lab)/dashboard',
  ADMIN: '/(admin)/dashboard',
};

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  const returnToSafeScreen = async () => {
    if (redirecting) {
      return;
    }

    try {
      setRedirecting(true);
      const [token, role] = await AsyncStorage.multiGet([
        'accessToken',
        'userRole',
      ]);
      const accessToken = token[1];
      const savedRole = String(role[1] ?? '').toUpperCase();

      if (!accessToken) {
        router.replace('/(auth)/login');
        return;
      }

      const destination = HOME_BY_ROLE[savedRole] ?? '/(auth)/login';
      router.replace(destination as never);
    } finally {
      setRedirecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="compass-outline"
            size={48}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>Screen not available</Text>
        <Text style={styles.description}>
          This destination does not exist or is no longer available. Return to
          a safe SwiftCare screen to continue.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={returnToSafeScreen}
          disabled={redirecting}
          activeOpacity={0.85}
        >
          {redirecting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="home-outline" size={19} color={colors.white} />
              <Text style={styles.primaryButtonText}>Return to SwiftCare</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/(auth)/login')}
          disabled={redirecting}
        >
          <Text style={styles.secondaryButtonText}>Go to sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconContainer: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    backgroundColor: colors.primaryLight,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.textPrimary,
  },
  description: {
    marginTop: 10,
    marginBottom: 28,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  primaryButton: {
    width: '100%',
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 13,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryButton: {
    marginTop: 12,
    padding: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
