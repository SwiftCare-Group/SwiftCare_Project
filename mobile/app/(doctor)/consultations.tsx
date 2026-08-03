import { useTheme, type AppColors } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';


export default function ConsultationsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[
          colors.headerGradientStart,
          colors.headerGradientEnd,
        ]}
        style={styles.header}
      >
        <View style={styles.headerIcon}>
          <Ionicons
            name="document-text-outline"
            size={24}
            color={colors.white}
          />
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Consultations</Text>

          <Text style={styles.headerSubtitle}>
            Manage patient consultations and clinical records
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.overviewCard}>
          <View style={styles.overviewIcon}>
            <Ionicons
              name="medical-outline"
              size={28}
              color={colors.primary}
            />
          </View>

          <Text style={styles.overviewTitle}>
            Doctor consultation workspace
          </Text>

          <Text style={styles.overviewText}>
            Select a patient from the queue to begin a consultation,
            record the diagnosis, add clinical notes, prescribe
            medication, and request laboratory tests.
          </Text>
        </View>

        <Text style={styles.workflowsectionTitle}>Consultation workflow</Text>

        <View style={styles.workflowCard}>
          <WorkflowItem
            number="1"
            icon="people-outline"
            title="Open patient queue"
            description="View patients ordered by medical urgency."
          />

          <View style={styles.workflowDivider} />

          <WorkflowItem
            number="2"
            icon="megaphone-outline"
            title="Call patient"
            description="Call the next patient when you are ready."
          />

          <View style={styles.workflowDivider} />

          <WorkflowItem
            number="3"
            icon="play-circle-outline"
            title="Start consultation"
            description="Open the clinical consultation form."
          />

          <View style={styles.workflowDivider} />

          <WorkflowItem
            number="4"
            icon="document-text-outline"
            title="Save clinical record"
            description="Record the diagnosis, notes, prescription and lab request."
          />

          <View style={styles.workflowDivider} />

          <WorkflowItem
            number="5"
            icon="checkmark-done-outline"
            title="Complete consultation"
            description="Finish the consultation and return to the queue."
          />
        </View>

        <TouchableOpacity
          style={styles.queueButton}
          activeOpacity={0.85}
          onPress={() => router.push('/(doctor)/queue')}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={colors.white}
          />

          <Text style={styles.queueButtonText}>
            Go to patient queue
          </Text>

          <Ionicons
            name="arrow-forward"
            size={19}
            color={colors.white}
          />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={colors.info}
          />

          <Text style={styles.infoText}>
            Completed clinical records are saved securely after the
            consultation form is submitted.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type WorkflowItemProps = {
  number: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

function WorkflowItem({
  number,
  icon,
  title,
  description,
}: WorkflowItemProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.workflowItem}>
      <View style={styles.workflowNumber}>
        <Text style={styles.workflowNumberText}>{number}</Text>
      </View>

      <View style={styles.workflowIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.primary}
        />
      </View>

      <View style={styles.workflowTextContainer}>
        <Text style={styles.workflowTitle}>{title}</Text>

        <Text style={styles.workflowDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.headerGradientStart,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 18,
    paddingBottom: 50,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  overviewCard: {
  alignItems: 'center',
  paddingHorizontal: 22,
  paddingVertical: 28,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 18,
  backgroundColor: colors.surface,
},

overviewIcon: {
  width: 68,
  height: 68,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.primaryLight,
},

overviewTitle: {
  marginTop: 16,
  fontSize: 19,
  fontWeight: '800',
  textAlign: 'center',
  color: colors.textPrimary,
},

overviewText: {
  marginTop: 8,
  fontSize: 13,
  lineHeight: 21,
  textAlign: 'center',
  color: colors.textSecondary,
},

sectionTitle: {
  marginTop: 24,
  marginBottom: 12,
  fontSize: 18,
  fontWeight: '800',
  color: colors.textPrimary,
},

workflowCard: {
  paddingHorizontal: 15,
  paddingVertical: 8,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 18,
  backgroundColor: colors.surface,
},

workflowItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
},

workflowNumber: {
  width: 26,
  height: 26,
  borderRadius: 13,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.primary,
},

workflowNumberText: {
  fontSize: 11,
  fontWeight: '800',
  color: colors.white,
},

workflowIcon: {
  width: 40,
  height: 40,
  marginHorizontal: 11,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.primaryLight,
},

workflowTextContainer: {
  flex: 1,
},

workflowTitle: {
  fontSize: 14,
  fontWeight: '800',
  color: colors.textPrimary,
},

workflowDescription: {
  marginTop: 3,
  fontSize: 12,
  lineHeight: 18,
  color: colors.textSecondary,
},

workflowDivider: {
  height: 1,
  marginLeft: 77,
  backgroundColor: colors.border,
},

queueButton: {
  minHeight: 52,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  marginTop: 20,
  paddingHorizontal: 18,
  borderRadius: 14,
  backgroundColor: colors.primary,
},

queueButtonText: {
  flex: 1,
  fontSize: 14,
  fontWeight: '800',
  textAlign: 'center',
  color: colors.white,
},

infoCard: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
  marginTop: 16,
  padding: 14,
  borderRadius: 13,
  backgroundColor: `${colors.info}12`,
},

infoText: {
  flex: 1,
  fontSize: 12,
  lineHeight: 19,
  color: colors.textSecondary,
},

  headerTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.white,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    marginRight: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },

  summaryValue: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  summaryLabel: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },

  errorCard: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
    borderRadius: 14,
    backgroundColor: `${colors.danger}0D`,
  },

  errorTextContainer: {
    flex: 1,
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.danger,
  },

  errorText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 13,
  },

  workflowsectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  sectionCount: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 75,
  },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  emptyText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.textSecondary,
  },

  recordCard: {
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    backgroundColor: colors.surface,
  },

  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  patientAvatar: {
    width: 43,
    height: 43,
    marginRight: 11,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },

  recordPatientInfo: {
    flex: 1,
  },

  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  recordDate: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textSecondary,
  },

  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: colors.successLight,
  },

  completedText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
  },

  recordSection: {
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  recordLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textDisabled,
  },

  recordValue: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textPrimary,
  },

  labRequestCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${colors.info}12`,
  },

  labTextContainer: {
    flex: 1,
  },

  labLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.info,
  },

  labValue: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textPrimary,
  },
});