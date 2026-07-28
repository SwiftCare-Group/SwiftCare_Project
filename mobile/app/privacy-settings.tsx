import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { goBackOrReplace } from '../utils/navigation';
import { useTheme } from '../context/ThemeContext';

const PRIVACY_KEY = 'swiftcarePrivacySettings';

type PrivacySettings = {
  medicalDataSharing: boolean;
  analyticsSharing: boolean;
  healthRecommendations: boolean;
};

const DEFAULT_PRIVACY: PrivacySettings = {
  medicalDataSharing: true,
  analyticsSharing: false,
  healthRecommendations: true,
};

const normalizePrivacySettings = (value: unknown): PrivacySettings => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_PRIVACY };
  }

  const candidate = value as Partial<PrivacySettings>;
  return {
    medicalDataSharing:
      typeof candidate.medicalDataSharing === 'boolean'
        ? candidate.medicalDataSharing
        : DEFAULT_PRIVACY.medicalDataSharing,
    analyticsSharing:
      typeof candidate.analyticsSharing === 'boolean'
        ? candidate.analyticsSharing
        : DEFAULT_PRIVACY.analyticsSharing,
    healthRecommendations:
      typeof candidate.healthRecommendations === 'boolean'
        ? candidate.healthRecommendations
        : DEFAULT_PRIVACY.healthRecommendations,
  };
};

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] =
    useState<keyof PrivacySettings | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(PRIVACY_KEY);
      setSettings(saved ? normalizePrivacySettings(JSON.parse(saved)) : DEFAULT_PRIVACY);
    } catch {
      Alert.alert(
        'Unable to load settings',
        'Your saved privacy settings could not be read. Default settings are being used.'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (
    key: keyof PrivacySettings,
    value: boolean
  ) => {
    if (savingKey) {
      return;
    }

    const previous = settings;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSavingKey(key);

    try {
      await AsyncStorage.setItem(PRIVACY_KEY, JSON.stringify(updated));
    } catch {
      setSettings(previous);
      Alert.alert(
        'Unable to save',
        'This privacy setting could not be saved on the device.'
      );
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => goBackOrReplace(router, '/settings')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacy Settings</Text>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.description, { color: colors.textSecondary }]}> 
            Control how SwiftCare uses and shares your healthcare information.
          </Text>

          <PrivacyItem
            icon="medical-outline"
            title="Medical Data Sharing"
            subtitle="Allow authorized healthcare providers to access your medical records"
            value={settings.medicalDataSharing}
            disabled={savingKey !== null}
            onChange={value => updateSetting('medicalDataSharing', value)}
          />
          <PrivacyItem
            icon="analytics-outline"
            title="Analytics Sharing"
            subtitle="Help improve SwiftCare by sharing anonymous usage data"
            value={settings.analyticsSharing}
            disabled={savingKey !== null}
            onChange={value => updateSetting('analyticsSharing', value)}
          />
          <PrivacyItem
            icon="heart-outline"
            title="Health Recommendations"
            subtitle="Receive personalized healthcare suggestions"
            value={settings.healthRecommendations}
            disabled={savingKey !== null}
            onChange={value => updateSetting('healthRecommendations', value)}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PrivacyItem({
  icon,
  title,
  subtitle,
  value,
  disabled,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}> 
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ false: colors.borderStrong, true: colors.primaryMuted }}
        thumbColor={value ? colors.primary : colors.surfaceSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  description: { fontSize: 14, lineHeight: 21, marginBottom: 20 },
  card: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabled: { opacity: 0.65 },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 14 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 4 },
});
