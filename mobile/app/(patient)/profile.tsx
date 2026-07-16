import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { showToast } from '../../utils/toast';


export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [subscription, setSubscription] =
    useState<SubscriptionData | null>(null);

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
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/subscriptions/status');
      setSubscription(response.data);
    } catch {
      setSubscription(null);
    }
  };

  const handleUpgrade = async (
    plan: 'MONTHLY' | 'YEARLY'
  ) => {
    setLoadingUpgrade(true);

    try {
      const response = await api.post(
        '/subscriptions/upgrade',
        { plan }
      );

      const { paymentUrl } = response.data;

      Alert.alert(
        'Complete Payment',
        `Open this link to complete your upgrade:\n\n${paymentUrl}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to initiate upgrade.');
    } finally {
      setLoadingUpgrade(false);
    }
  };

const handleLogout = async () => {
  try {

    await AsyncStorage.multiRemove([
      'accessToken',
      'swiftcareSettings',
      'swiftcareNotifications',
      'swiftcarePrivacySettings',
    ]);


    router.replace('/(auth)/login');


  } catch (error) {

    console.error(
      'Logout failed:',
      error
    );

  }
};  if (loadingProfile) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  const isPremium = profile?.tier === 'PREMIUM';

  const accountItems = [
    {
      icon: 'person-outline' as const,
      label: 'Full Name',
      value: profile?.name,
    },
    {
      icon: 'mail-outline' as const,
      label: 'Email',
      value: profile?.email,
    },
    {
      icon: 'call-outline' as const,
      label: 'Phone',
      value: profile?.phone,
    },
  ];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.headerGradientStart,
        },
      ]}
      edges={['top']}
    >
      <LinearGradient
        colors={[
          colors.headerGradientStart,
          colors.headerGradientEnd,
        ]}
        style={styles.profileHeader}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>

          <View
            style={[
              styles.tierBadge,
              {
                backgroundColor: isPremium
                  ? colors.warning
                  : 'rgba(255,255,255,0.2)',
              },
            ]}
          >
            <Ionicons
              name={isPremium ? 'star' : 'person-outline'}
              size={10}
              color={colors.white}
            />

            <Text style={styles.tierBadgeText}>
              {isPremium ? 'PREMIUM' : 'FREE'}
            </Text>
          </View>
        </View>

        <Text style={styles.profileName}>
          {profile?.name || 'SwiftCare User'}
        </Text>

        <Text style={styles.profileEmail}>
          {profile?.email || 'No email available'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account details */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.textPrimary },
            ]}
          >
            Account Details
          </Text>

          {accountItems.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.infoRow,
                index < accountItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.infoLeft}>
                <View
                  style={[
                    styles.infoIcon,
                    {
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={colors.primary}
                  />
                </View>

                <Text
                  style={[
                    styles.infoLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </View>

              <Text
                style={[
                  styles.infoValue,
                  { color: colors.textPrimary },
                ]}
              >
                {item.value || '—'}
              </Text>
            </View>
          ))}
        </View>

        {/* Subscription */}
        {subscription ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: colors.textPrimary },
              ]}
            >
              Subscription
            </Text>

            {[
              {
                label: 'Plan',
                value: subscription.plan || '—',
              },
              {
                label: 'Status',
                value: subscription.status || '—',
              },
              {
                label: 'Expires',
                value: subscription.expiresAt
                  ? new Date(
                      subscription.expiresAt
                    ).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—',
              },
            ].map((item, index, array) => (
              <View
                key={item.label}
                style={[
                  styles.infoRow,
                  index < array.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.infoLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>

                <Text
                  style={[
                    styles.infoValue,
                    { color: colors.textPrimary },
                  ]}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        ) : !isPremium ? (
          <View style={styles.upgradeCard}>
            <LinearGradient
              colors={[
                colors.headerGradientStart,
                colors.headerGradientEnd,
              ]}
              style={styles.upgradeGradient}
            >
              <View style={styles.upgradeHeader}>
                <Ionicons
                  name="star-outline"
                  size={24}
                  color={colors.white}
                />

                <Text style={styles.upgradeTitle}>
                  Upgrade to Premium
                </Text>
              </View>

              <Text style={styles.upgradeSubtitle}>
                Priority queue · Live consultations · Digital
                prescriptions
              </Text>

              <View style={styles.planRow}>
                <TouchableOpacity
                  style={styles.planButton}
                  onPress={() => handleUpgrade('MONTHLY')}
                  disabled={loadingUpgrade}
                  activeOpacity={0.8}
                >
                  <Text style={styles.planButtonLabel}>
                    Monthly
                  </Text>

                  <Text style={styles.planButtonPrice}>
                    GHS 100
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.planButton,
                    styles.planButtonBest,
                    { backgroundColor: colors.white },
                  ]}
                  onPress={() => handleUpgrade('YEARLY')}
                  disabled={loadingUpgrade}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.planBestLabel,
                      { color: colors.primary },
                    ]}
                  >
                    Best Value
                  </Text>

                  <Text
                    style={[
                      styles.planButtonLabelBest,
                      { color: colors.primary },
                    ]}
                  >
                    Yearly
                  </Text>

                  <Text
                    style={[
                      styles.planButtonPriceBest,
                      { color: colors.primary },
                    ]}
                  >
                    GHS 1,000
                  </Text>
                </TouchableOpacity>
              </View>

              {loadingUpgrade ? (
                <ActivityIndicator
                  size="small"
                  color={colors.white}
                  style={styles.upgradeLoader}
                />
              ) : null}
            </LinearGradient>
          </View>
        ) : null}

        {/* Preferences */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.textPrimary },
            ]}
          >
            Preferences
          </Text>
          <TouchableOpacity
  style={styles.menuRow}
  activeOpacity={0.7}
  onPress={() => router.push('/edit-profile')}
>
  <View style={styles.menuLeft}>
    <View
      style={[
        styles.infoIcon,
        {
          backgroundColor: colors.primaryLight,
        },
      ]}
    >
      <Ionicons
        name="create-outline"
        size={18}
        color={colors.primary}
      />
    </View>

    <View style={styles.menuTextContainer}>
      <Text
        style={[
          styles.menuTitle,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        Edit Profile
      </Text>

      <Text
        style={[
          styles.menuSubtitle,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        Update your name, phone number and personal details
      </Text>
    </View>
  </View>

  <Ionicons
    name="chevron-forward"
    size={20}
    color={colors.textSecondary}
  />
</TouchableOpacity>

<View
  style={[
    styles.menuDivider,
    {
      backgroundColor: colors.border,
    },
  ]}
/>

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push('/settings')}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.infoIcon,
                  {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>

              <View style={styles.menuTextContainer}>
                <Text
                  style={[
                    styles.menuTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Settings
                </Text>

                <Text
                  style={[
                    styles.menuSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Notifications, appearance and security
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        

        {/* Logout */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            { borderColor: colors.danger },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color={colors.danger}
          />

          <Text
            style={[
              styles.logoutText,
              { color: colors.danger },
            ]}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  content: {
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },

  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
  },

  tierBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  tierBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '700',
  },

  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },

  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },

  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },

  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoLabel: {
    fontSize: 14,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '55%',
    textAlign: 'right',
  },

  upgradeCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },

  upgradeGradient: {
    padding: 20,
  },

  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },

  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },

  upgradeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    lineHeight: 20,
  },

  planRow: {
    flexDirection: 'row',
    gap: 12,
  },

  planButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },

  planButtonBest: {
    flex: 1,
  },

  planBestLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },

  planButtonLabel: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },

  planButtonPrice: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '800',
    marginTop: 4,
  },

  planButtonLabelBest: {
    fontSize: 14,
    fontWeight: '600',
  },

  planButtonPriceBest: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },

  upgradeLoader: {
    marginTop: 14,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  menuTextContainer: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },

  menuSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuDivider: {
  height: 1,
  marginVertical: 8,
  marginLeft: 44,
},
});