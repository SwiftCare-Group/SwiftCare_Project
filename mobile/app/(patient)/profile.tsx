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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { showToast } from '../../utils/toast';


export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
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
      console.error('Failed to fetch profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/subscriptions/status');
      setSubscription(response.data);
    } catch {
      // no subscription
    }
  };

  const handleUpgrade = async (plan: 'MONTHLY' | 'YEARLY') => {
    setLoadingUpgrade(true);
    try {
      const response = await api.post('/subscriptions/upgrade', { plan });
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

  const isPremium = profile?.tier === 'PREMIUM';

  return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Fixed Header */}
        <LinearGradient
          colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
          style={styles.profileHeader}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={[
              styles.tierBadge,
              { backgroundColor: isPremium ? Colors.warning : 'rgba(255,255,255,0.2)' }
            ]}>
              <Ionicons
                name={isPremium ? 'star' : 'person-outline'}
                size={10}
                color={Colors.white}
              />
              <Text style={styles.tierBadgeText}>
                {isPremium ? 'PREMIUM' : 'FREE'}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{profile?.name}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
        </LinearGradient>
          
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>
          {[
            { icon: 'person-outline', label: 'Full Name', value: profile?.name },
            { icon: 'mail-outline', label: 'Email', value: profile?.email },
            { icon: 'call-outline', label: 'Phone', value: profile?.phone },
          ].map((item, index) => (
            <View key={index} style={[styles.infoRow, index < 2 && styles.infoRowBorder]}>
              <View style={styles.infoLeft}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon as any} size={16} color={Colors.primary} />
                </View>
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
              <Text style={styles.infoValue}>{item.value ?? '—'}</Text>
            </View>
          ))}
        </View>

        {/* Subscription */}
        {subscription ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Subscription</Text>
            {[
              { label: 'Plan', value: subscription.plan },
              { label: 'Status', value: subscription.status },
              { label: 'Expires', value: new Date(subscription.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
            ].map((item, index) => (
              <View key={index} style={[styles.infoRow, index < 2 && styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : !isPremium ? (
          <View style={styles.upgradeCard}>
            <LinearGradient
              colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
              style={styles.upgradeGradient}
            >
              <View style={styles.upgradeHeader}>
                <Ionicons name="star-outline" size={24} color={Colors.white} />
                <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
              </View>
              <Text style={styles.upgradeSubtitle}>
                Priority queue · Live consultations · Digital prescriptions
              </Text>

              <View style={styles.planRow}>
                <TouchableOpacity
                  style={styles.planButton}
                  onPress={() => handleUpgrade('MONTHLY')}
                  disabled={loadingUpgrade}
                >
                  <Text style={styles.planButtonLabel}>Monthly</Text>
                  <Text style={styles.planButtonPrice}>GHS 100</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.planButton, styles.planButtonBest]}
                  onPress={() => handleUpgrade('YEARLY')}
                  disabled={loadingUpgrade}
                >
                  <Text style={styles.planBestLabel}>Best Value</Text>
                  <Text style={styles.planButtonLabelBest}>Yearly</Text>
                  <Text style={styles.planButtonPriceBest}>GHS 1,000</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ) : null}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40, },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  profileHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.white },
  tierBadge: { position: 'absolute', bottom: 0, right: -4, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tierBadgeText: { fontSize: 10, color: Colors.white, fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  card: { backgroundColor: Colors.surface, marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, maxWidth: '55%', textAlign: 'right' },
  upgradeCard: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  upgradeGradient: { padding: 20 },
  upgradeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  upgradeTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  upgradeSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 20, lineHeight: 20 },
  planRow: { flexDirection: 'row', gap: 12 },
  planButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 14, alignItems: 'center' },
  planButtonBest: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 14, alignItems: 'center' },
  planBestLabel: { fontSize: 10, color: Colors.primary, fontWeight: '700', marginBottom: 4 },
  planButtonLabel: { fontSize: 14, color: Colors.white, fontWeight: '600' },
  planButtonPrice: { fontSize: 16, color: Colors.white, fontWeight: '800', marginTop: 4 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 20, borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 14, paddingVertical: 14 },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: '700' },
  planButtonLabelBest: { fontSize: 14, color: Colors.primary, fontWeight: '600',},
  planButtonPriceBest: { fontSize: 16, color: Colors.primary, fontWeight: '800', marginTop: 4,},
});