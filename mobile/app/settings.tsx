import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  getSettings,
  DEFAULT_SETTINGS,
  updateSetting,
  SwiftCareSettings,
} from '../services/notificationStorage';
import { Colors } from '../constants/colors';


type SettingsState = SwiftCareSettings;


export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const [settings, setSettings] =
    useState<SettingsState>(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

const loadSettings = async () => {
  try {
    const savedSettings = await getSettings();

    setSettings(savedSettings);

  } catch (error) {
    console.error(
      'Failed to load settings:',
      error
    );

  } finally {
    setLoading(false);
  }
};
const handleSettingChange = async (
  key: keyof SettingsState,
  value: boolean
) => {
  try {
    const updatedSettings = await updateSetting(
      key,
      value
    );

    setSettings(updatedSettings);
  } catch (error) {
    console.error(
      'Failed to update setting:',
      error
    );

    Alert.alert(
      'Settings Error',
      'Your preference could not be saved.'
    );
  }
};
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
        />
      </View>
    );
  }

return (
  <SafeAreaView
    style={[
      styles.safeArea,
      { backgroundColor: colors.surface },
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
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
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
          { color: colors.textPrimary },
        ]}
      >
        Settings
      </Text>

      <View style={styles.headerPlaceholder} />
    </View>

    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
        {/* Account */}

<Text
  style={[
    styles.sectionTitle,
    { color: colors.textSecondary },
  ]}
>
  Account
</Text>

<View
  style={[
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
  ]}
>
  <SettingButton
    icon="person-outline"
    title="Edit Profile"
    onPress={() => router.push('/edit-profile')}
  />

  <View
    style={[
      styles.divider,
      {
        backgroundColor: colors.border,
      },
    ]}
  />

  <SettingButton
    icon="lock-closed-outline"
    title="Change Password"
onPress={() => router.push('/change-password')}  />
</View>

      {/* Appearance */}
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.textSecondary },
        ]}
      >
        Appearance
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <SettingSwitch
          icon="moon-outline"
          title="Dark mode"
          description="Use a darker appearance throughout SwiftCare"
          value={isDarkMode}
onValueChange={async () => {
  toggleTheme();

  await handleSettingChange(
    'darkMode',
    !isDarkMode
  );
}}        />
      </View>

      {/* Notifications */}
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.textSecondary },
        ]}
      >
        Notifications
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
<SettingSwitch
  icon="calendar-outline"
  title="Appointment reminders"
  description="Receive reminders before appointments"
  value={settings.appointmentReminders}
  onValueChange={(value) =>
    handleSettingChange(
      'appointmentReminders',
      value
    )
  }
/>
        <View
          style={[
            styles.divider,
            { backgroundColor: colors.border },
          ]}
        />

        <SettingSwitch
          icon="people-outline"
          title="Queue updates"
          description="Get notified when your queue position changes"
          value={settings.queueUpdates}
          onValueChange={(value) =>
           handleSettingChange('queueUpdates', value)
          }
        />

        <View
          style={[
            styles.divider,
            { backgroundColor: colors.border },
          ]}
        />

        <SettingSwitch
          icon="medical-outline"
          title="Prescription reminders"
          description="Receive reminders to take or refill medicines"
          value={settings.prescriptionReminders}
          onValueChange={(value) =>
            handleSettingChange('prescriptionReminders', value)
          }
        />
      </View>

      {/* Security */}
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.textSecondary },
        ]}
      >
        Security
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <SettingSwitch
          icon="finger-print-outline"
          title="Biometric login"
          description="Use fingerprint or Face ID to unlock SwiftCare"
          value={settings.biometricLogin}
          onValueChange={(value) =>
            handleSettingChange('biometricLogin', value)
          }
        />
      </View>

      {/* General */}
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.textSecondary },
        ]}
      >
        General
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <SettingButton
          icon="language-outline"
          title="Language"
          value="English"
          onPress={() => {
            Alert.alert(
              'Language',
              'More language options will be added soon.'
            );
          }}
        />

        <View
          style={[
            styles.divider,
            { backgroundColor: colors.border },
          ]}
        />

        <SettingButton
          icon="help-circle-outline"
          title="Help and support"
          onPress={() => {
            Alert.alert(
              'Help and Support',
              'Contact the SwiftCare support team for assistance.'
            );
          }}
        />
        

        <View
          style={[
            styles.divider,
            { backgroundColor: colors.border },
          ]}
        />

        <SettingButton
          icon="information-circle-outline"
          title="About SwiftCare"
          value="Version 1.0.0"
          onPress={() => {
            Alert.alert(
              'SwiftCare',
              'SwiftCare helps patients book appointments, monitor queues and access healthcare services.'
            );
          }}
        />

        <SettingButton
  icon="shield-checkmark-outline"
  title="Privacy Settings"
  onPress={() =>
    router.push('/privacy-settings')
  }
/>

<SettingButton
  icon="shield-outline"
  title="Privacy Policy"
  onPress={() =>
    router.push('/privacy-policy')
  }
/>

<SettingButton
  icon="document-text-outline"
  title="Terms & Conditions"
  onPress={() =>
    router.push('/terms')
  }
/>
      </View>
    </ScrollView>
  </SafeAreaView>
);}
type SettingSwitchProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingSwitch({
  icon,
  title,
  description,
  value,
  onValueChange,
}: SettingSwitchProps) {

  const { colors } = useTheme();

  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryLight },
          ]}
        >
          <Ionicons
            name={icon}
            size={19}
            color={colors.primary}
          />
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[
              styles.settingTitle,
              { color: colors.textPrimary },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.settingDescription,
              { color: colors.textSecondary },
            ]}
          >
            {description}
          </Text>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.borderStrong,
          true: colors.primaryMuted,
        }}
        thumbColor={
          value ? colors.primary : colors.surfaceSecondary
        }
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

function SettingButton({
  icon,
  title,
  value,
  onPress,
}: SettingButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryLight },
          ]}
        >
          <Ionicons
            name={icon}
            size={19}
            color={colors.primary}
          />
        </View>

        <Text
          style={[
            styles.settingTitle,
            { color: colors.textPrimary },
          ]}
        >
          {title}
        </Text>
      </View>

      <View style={styles.settingRight}>
        {value ? (
          <Text
            style={[
              styles.settingValue,
              { color: colors.textSecondary },
            ]}
          >
            {value}
          </Text>
        ) : null}

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  headerPlaceholder: {
    width: 40,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  settingRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },

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
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  textContainer: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  settingDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: 3,
  },

  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  settingValue: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 6,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 52,
  },
});