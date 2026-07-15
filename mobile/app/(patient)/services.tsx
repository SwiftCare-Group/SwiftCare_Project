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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../context/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';

type ServiceItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  comingSoon?: boolean;
};

const SERVICES: ServiceItem[] = [
  {
    id: 'medical-history',
    title: 'Medical History',
    subtitle: 'View your previous appointments and care records',
    icon: 'document-text-outline',
    route: '/(patient)/medical-history',
  },
  {
    id: 'prescriptions',
    title: 'Prescriptions',
    subtitle: 'Access your active and previous prescriptions',
    icon: 'medical-outline',
    route: '/(patient)/prescription',
  },
  {
    id: 'lab-results',
    title: 'Laboratory Results',
    subtitle: 'Review test results and medical reports',
    icon: 'flask-outline',
    comingSoon: true,
  },
  {
    id: 'doctors',
    title: 'Doctors',
    subtitle: 'Find doctors and view their specialties',
    icon: 'people-outline',
    comingSoon: true,
  },
  {
    id: 'symptoms',
    title: 'AI Symptom Checker',
    subtitle: 'Assess symptoms before booking an appointment',
    icon: 'pulse-outline',
    route: '/(patient)/symptoms',
  },
  {
    id: 'emergency-contact',
    title: 'Emergency Contact',
    subtitle: 'Manage emergency contacts and urgent assistance',
    icon: 'call-outline',
    comingSoon: true,
  },
  {
    id: 'hospital-map',
    title: 'Hospital Navigation',
    subtitle: 'Find departments and services inside the hospital',
    icon: 'map-outline',
    comingSoon: true,
  },
  {
    id: 'insurance',
    title: 'Insurance',
    subtitle: 'Manage health insurance and payment details',
    icon: 'shield-checkmark-outline',
    comingSoon: true,
  },
  {
    id: 'health-records',
    title: 'Health Records',
    subtitle: 'Track allergies, vitals and important health details',
    icon: 'heart-outline',
    comingSoon: true,
  },
];

export default function ServicesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lightTap } = useHaptics();

  const openService = (service: ServiceItem) => {
    lightTap();

    if (service.route) {
      router.push(service.route as any);
      return;
    }

    Alert.alert(
      service.title,
      'This SwiftCare service is currently being prepared and will be available soon.'
    );
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
                  name={service.icon}
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
                  >
                    {service.title}
                  </Text>

                  {service.comingSoon ? (
                    <View
                      style={[
                        styles.comingSoonBadge,
                        {
                          backgroundColor: colors.warningLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.comingSoonText,
                          {
                            color: colors.warning,
                          },
                        ]}
                      >
                        Soon
                      </Text>
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
    paddingBottom: 40,
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

  serviceSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  comingSoonBadge: {
    marginLeft: 8,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  comingSoonText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  supportCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
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