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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { goBackOrReplace } from '../utils/navigation';
import { useTheme } from '../context/ThemeContext';
import {
  DEFAULT_SETTINGS,
  getSettings,
  SwiftCareSettings,
  updateSetting,
} from '../services/notificationStorage';
import { Colors } from '../constants/colors';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDarkMode, setTheme } = useTheme();
  const [settings, setSettings] =
    useState<SwiftCareSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] =
    useState<keyof SwiftCareSettings | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await getSettings();
      // Biometric authentication is not installed in this build. Never show a
      // persisted switch as active when no secure implementation exists.
      const safeSettings = {
        ...savedSettings,
        biometricLogin: false,
      };
      setSettings(safeSettings);
      if (savedSettings.biometricLogin) {
        await updateSetting('biometricLogin', false);
      }
    } catch {
      Alert.alert(
        'Settings Error',
        'Your saved preferences could not be loaded. Default settings are being used.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (
    key: keyof SwiftCareSettings,
    value: boolean
  ) => {
    if (savingKey) {
      return;
    }

    const previousSettings = settings;
    setSettings(current => ({ ...current, [key]: value }));
    setSavingKey(key);

    try {
      const updatedSettings = await updateSetting(key, value);
      setSettings(updatedSettings);
    } catch {
      setSettings(previousSettings);
      Alert.alert('Settings Error', 'Your preference could not be saved.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleThemeChange = async (value: boolean) => {
    if (savingKey) {
      return;
    }

    const previousMode = isDarkMode ? 'dark' : 'light';
    setSavingKey('darkMode');
    await setTheme(value ? 'dark' : 'light');

    try {
      const updatedSettings = await updateSetting('darkMode', value);
      setSettings(updatedSettings);
    } catch {
      await setTheme(previousMode);
      Alert.alert('Settings Error', 'Your theme preference could not be saved.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
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
          style={styles.backButton}
          onPress={() => goBackOrReplace(router, '/(patient)/profile')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle title="Account" color={colors.textSecondary} />
        <SettingsCard colors={colors}>
          <SettingButton
            icon="person-outline"
            title="Edit Profile"
            onPress={() => router.push('/edit-profile')}
          />
          <Divider color={colors.border} />
          <SettingButton
            icon="lock-closed-outline"
            title="Change Password"
            onPress={() => router.push('/change-password')}
          />
        </SettingsCard>

        <SectionTitle title="Appearance" color={colors.textSecondary} />
        <SettingsCard colors={colors}>
          <SettingSwitch
            icon="moon-outline"
            title="Dark mode"
            description="Use a darker appearance throughout SwiftCare"
            value={isDarkMode}
            disabled={savingKey === 'darkMode'}
            onValueChange={handleThemeChange}
          />
        </SettingsCard>

        <SectionTitle title="Notifications" color={colors.textSecondary} />
        <SettingsCard colors={colors}>
          <SettingSwitch
            icon="calendar-outline"
            title="Appointment reminders"
            description="Receive reminders before appointments"
            value={settings.appointmentReminders}
            disabled={savingKey !== null}
            onValueChange={value =>
              handleSettingChange('appointmentReminders', value)
            }
          />
          <Divider color={colors.border} />
          <SettingSwitch
            icon="people-outline"
            title="Queue updates"
            description="Get notified when your queue position changes"
            value={settings.queueUpdates}
            disabled={savingKey !== null}
            onValueChange={value => handleSettingChange('queueUpdates', value)}
          />
          <Divider color={colors.border} />
          <SettingSwitch
            icon="medical-outline"
            title="Prescription reminders"
            description="Receive reminders to take or refill medicines"
            value={settings.prescriptionReminders}
            disabled={savingKey !== null}
            onValueChange={value =>
              handleSettingChange('prescriptionReminders', value)
            }
          />
        </SettingsCard>

        <SectionTitle title="Security" color={colors.textSecondary} />
        <SettingsCard colors={colors}>
          <SettingSwitch
            icon="finger-print-outline"
            title="Biometric login"
            description="Unavailable until secure device authentication is configured"
            value={false}
            disabled
            onValueChange={() => undefined}
          />
        </SettingsCard>

        <SectionTitle title="General" color={colors.textSecondary} />
        <SettingsCard colors={colors}>
          <SettingButton
            icon="language-outline"
            title="Language"
            value="English"
            onPress={() =>
              Alert.alert('Language', 'More language options will be added soon.')
            }
          />
          <Divider color={colors.border} />
          <SettingButton
            icon="help-circle-outline"
            title="Help and support"
            onPress={() =>
              Alert.alert(
                'Help and Support',
                'Contact the SwiftCare support team for assistance.'
              )
            }
          />
          <Divider color={colors.border} />
          <SettingButton
            icon="information-circle-outline"
            title="About SwiftCare"
            value="Version 1.0.0"
            onPress={() =>
              Alert.alert(
                'SwiftCare',
                'SwiftCare helps patients book appointments, monitor queues and access healthcare services.'
              )
            }
          />
          <Divider color={colors.border} />
          <SettingButton
            icon="shield-checkmark-outline"
            title="Privacy Settings"
            onPress={() => router.push('/privacy-settings')}
          />
          <Divider color={colors.border} />
          <SettingButton
            icon="shield-outline"
            title="Privacy Policy"
            onPress={() => router.push('/privacy-policy')}
          />
          <Divider color={colors.border} />
          <SettingButton
            icon="document-text-outline"
            title="Terms & Conditions"
            onPress={() => router.push('/terms')}
          />
        </SettingsCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return <Text style={[styles.sectionTitle, { color }]}>{title}</Text>;
}

function SettingsCard({
  colors,
  children,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

type SettingSwitchProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingSwitch({
  icon,
  title,
  description,
  value,
  disabled = false,
  onValueChange,
}: SettingSwitchProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.settingRow, disabled && styles.disabledRow]}>
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryLight },
          ]}
        >
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, { color: colors.textPrimary }]}> 
            {title}
          </Text>
          <Text style={[styles.settingDescription, { color: colors.textSecondary }]}> 
            {description}
          </Text>
        </View>
      </View>

      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        accessibilityLabel={title}
        trackColor={{
          false: colors.borderStrong,
          true: colors.primaryMuted,
        }}
        thumbColor={value ? colors.primary : colors.surfaceSecondary}
      />
    </View>
  );
}

type SettingButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value?: string;
  onPress: () => void;
};

function SettingButton({ icon, title, value, onPress }: SettingButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryLight },
          ]}
        >
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>
        <Text style={[styles.settingTitle, { color: colors.textPrimary }]}> 
          {title}
        </Text>
      </View>

      <View style={styles.settingRight}>
        {value ? (
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}> 
            {value}
          </Text>
        ) : null}
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerPlaceholder: { width: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: { borderRadius: 16, paddingHorizontal: 16, borderWidth: 1 },
  settingRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  disabledRow: { opacity: 0.58 },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600' },
  settingDescription: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingValue: { fontSize: 13 },
});
