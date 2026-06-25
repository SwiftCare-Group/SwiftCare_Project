import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

interface PatientProfile {
  name: string;
  email: string;
  phone: string;
  tier: 'FREE' | 'PREMIUM';
}

interface Subscription {
  plan: string;
  status: string;
  expiresAt: string;
}

export default function ProfileScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchSubscription();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/patients/me');
      setProfile(response.data);
    } catch (error) {
      // handle error
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/subscriptions/status');
      setSubscription(response.data);
    } catch (error) {
      // no subscription yet
    }
  };

  const handleUpgrade = async (plan: 'MONTHLY' | 'YEARLY') => {
    setLoadingUpgrade(true);
    try {
      const response = await api.post('/subscriptions/upgrade', { plan });
      const { paymentUrl } = response.data;
      Alert.alert(
        'Upgrade to Premium',
        `Open this link to complete payment:\n\n${paymentUrl}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to initiate upgrade.';
      Alert.alert('Error', message);
    } finally {
      setLoadingUpgrade(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('accessToken');
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loadingProfile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>My Profile</Text>

      {/* Tier Badge */}
      <View style={styles.tierBadgeRow}>
        <View
          style={[
            styles.tierBadge,
            {
              backgroundColor:
                profile?.tier === 'PREMIUM'
                  ? Colors.tierPremiumBg
                  : Colors.tierFreeBg,
            },
          ]}
        >
          <Text
            style={[
              styles.tierBadgeText,
              {
                color:
                  profile?.tier === 'PREMIUM'
                    ? Colors.tierPremium
                    : Colors.tierFree,
              },
            ]}
          >
            {profile?.tier === 'PREMIUM' ? 'PREMIUM' : 'FREE'} PLAN
          </Text>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{profile?.name ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile?.email ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{profile?.phone ?? '—'}</Text>
        </View>
      </View>

      {/* Subscription */}
      {subscription ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan</Text>
            <Text style={styles.infoValue}>{subscription.plan}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{subscription.status}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expires</Text>
            <Text style={styles.infoValue}>
              {new Date(subscription.expiresAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Upgrade to Premium</Text>
          <Text style={styles.upgradeText}>
            Get priority queue placement, live doctor consultations, digital
            prescriptions and more.
          </Text>
          <TouchableOpacity
            style={[styles.upgradeButton, loadingUpgrade && styles.buttonDisabled]}
            onPress={() => handleUpgrade('MONTHLY')}
            disabled={loadingUpgrade}
          >
            {loadingUpgrade ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.upgradeButtonText}>Monthly Plan</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.upgradeButtonOutline, loadingUpgrade && styles.buttonDisabled]}
            onPress={() => handleUpgrade('YEARLY')}
            disabled={loadingUpgrade}
          >
            <Text style={styles.upgradeButtonOutlineText}>
              Yearly Plan — Best Value
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
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
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  tierBadgeRow: {
    marginBottom: 20,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  upgradeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  upgradeButtonOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  upgradeButtonOutlineText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});