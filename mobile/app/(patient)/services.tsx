import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../context/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';
import { getPremiumEntitlement } from '../../services/subscription';

type ServiceItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  premium?: boolean;
};

const SERVICES: ServiceItem[] = [
  {
    id: 'medical-history',
    title: 'Medical History',
    subtitle: 'View diagnoses, consultation notes and completed visits',
    icon: 'document-text-outline',
    route: '/(patient)/medical-history',
  },
  {
    id: 'prescriptions',
    title: 'Prescriptions',
    subtitle: 'Show secure QR codes and track pharmacy dispensing',
    icon: 'medical-outline',
    route: '/(patient)/prescription',
  },
  {
    id: 'lab-results',
    title: 'Laboratory Results',
    subtitle: 'Follow pending tests and review completed results',
    icon: 'flask-outline',
    route: '/(patient)/lab-results',
  },
  {
    id: 'consultation',
    title: 'Online Consultation',
    subtitle: 'Find an available doctor and book a premium video visit',
    icon: 'videocam-outline',
    route: '/(patient)/consultation',
    premium: true,
  },
  {
    id: 'symptoms',
    title: 'AI Symptom Checker',
    subtitle: 'Assess symptoms before booking an appointment',
    icon: 'pulse-outline',
    route: '/(patient)/symptoms',
  },
  {
    id: 'appointments',
    title: 'Appointments',
    subtitle: 'Book a department visit and manage upcoming appointments',
    icon: 'calendar-outline',
    route: '/(patient)/appointments',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Review queue, prescription and care updates',
    icon: 'notifications-outline',
    route: '/notifications',
  },
  {
    id: 'settings',
    title: 'Settings and Privacy',
    subtitle: 'Manage your profile, security and notification preferences',
    icon: 'settings-outline',
    route: '/settings',
  },
];

export default function ServicesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lightTap } = useHaptics();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getPremiumEntitlement()
        .then(entitlement => {
          if (active) {
            setIsPremium(entitlement.isPremium);
          }
        })
        .catch(() => {
          if (active) {
            setIsPremium(null);
          }
        });

      return () => {
        active = false;
      };
    }, [])
  );

  const openService = (service: ServiceItem) => {
    lightTap();

    if (service.premium && isPremium === false) {
      Alert.alert(
        'Premium required',
        'Online video consultations require an active Premium subscription.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'View Plans',
            onPress: () => router.push('/(patient)/profile'),
          },
        ]
      );
      return;
    }

    router.push(service.route as any);
  };

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
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Healthcare Services</Text>

        <Text style={styles.headerSubtitle}>
          Access your medical records, prescriptions and hospital services
        </Text>
      </LinearGradient>

      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.introCard,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.introIcon,
              {
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Ionicons
              name="apps-outline"
              size={25}
              color={colors.primary}
            />
          </View>

          <View style={styles.introText}>
            <Text
              style={[
                styles.introTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Everything in one place
            </Text>

            <Text
              style={[
                styles.introSubtitle,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Choose a healthcare service to continue.
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          Available Services
        </Text>

        <View style={styles.servicesContainer}>
          {SERVICES.map(service => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => openService(service)}
            >
              <View
                style={[
                  styles.serviceIcon,
                  {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name={
                    service.premium && isPremium === false
                      ? 'lock-closed-outline'
                      : service.icon
                  }
                  size={23}
                  color={colors.primary}
                />
              </View>

              <View style={styles.serviceContent}>
                <View style={styles.serviceTitleRow}>
                  <Text
                    style={[
                      styles.serviceTitle,
                      {
                        color: colors.textPrimary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {service.title}
                  </Text>

                  {service.premium ? (
                    <View style={styles.premiumTag}>
                      <Text style={styles.premiumTagText}>Premium</Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.serviceSubtitle,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {service.subtitle}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textDisabled}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={[
            styles.supportCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.supportIcon,
              {
                backgroundColor: colors.infoLight,
              },
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={colors.info}
            />
          </View>

          <View style={styles.supportContent}>
            <Text
              style={[
                styles.supportTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Need help?
            </Text>

            <Text
              style={[
                styles.supportSubtitle,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Contact SwiftCare support if you need assistance using any service.
            </Text>
          </View>
        </View>
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

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  headerSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 5,
    maxWidth: 310,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },

  introCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  introText: {
    flex: 1,
  },

  introTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },

  introSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 13,
  },

  servicesContainer: {
    gap: 11,
  },

  serviceCard: {
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  serviceIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  serviceContent: {
    flex: 1,
    paddingRight: 10,
  },

  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  serviceTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
  },

  premiumTag: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FFF3CD',
  },

  premiumTagText: {
    color: '#8A6500',
    fontSize: 10,
    fontWeight: '700',
  },

  serviceSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  supportCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },

  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  supportContent: {
    flex: 1,
  },

  supportTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },

  supportSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
});