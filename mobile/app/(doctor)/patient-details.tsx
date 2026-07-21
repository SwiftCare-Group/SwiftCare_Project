import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";

export default function PatientDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const {
    patientId,
    patientName,
    phone,
    age,
    severityScore,
    complaint,
    appointmentTime,
    queuePosition,
  } = useLocalSearchParams<{
    patientId?: string;
    patientName?: string;
    phone?: string;
    age?: string;
    severityScore?: string;
    complaint?: string;
    appointmentTime?: string;
    queuePosition?: string;
  }>();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.headerGradientStart },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Patient Details</Text>
          <Text style={styles.headerSubtitle}>
            Review patient information
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: colors.primary },
              ]}
            >
              {patientName?.trim()?.charAt(0)?.toUpperCase() || "P"}
            </Text>
          </View>

          <Text
            style={[
              styles.patientName,
              { color: colors.textPrimary },
            ]}
          >
            {patientName || "Patient"}
          </Text>

          <Text
            style={[
              styles.patientId,
              { color: colors.textSecondary },
            ]}
          >
            ID: {patientId || "Not available"}
          </Text>
        </View>

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
              styles.sectionTitle,
              { color: colors.textPrimary },
            ]}
          >
            Personal Information
          </Text>

          <DetailRow
            icon="call-outline"
            label="Phone number"
            value={phone || "Not available"}
            colors={colors}
          />

          <DetailRow
            icon="calendar-outline"
            label="Age"
            value={age ? `${age} years` : "Not available"}
            colors={colors}
          />

          <DetailRow
            icon="list-outline"
            label="Queue position"
            value={
              queuePosition
                ? `#${queuePosition}`
                : "Not available"
            }
            colors={colors}
            last
          />
        </View>

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
              styles.sectionTitle,
              { color: colors.textPrimary },
            ]}
          >
            Medical Information
          </Text>

          <DetailRow
            icon="pulse-outline"
            label="Severity score"
            value={
              severityScore
                ? `${severityScore}/10`
                : "Not available"
            }
            colors={colors}
          />

          <DetailRow
            icon="time-outline"
            label="Appointment time"
            value={appointmentTime || "Not available"}
            colors={colors}
            last
          />

          <View
            style={[
              styles.complaintBox,
              { backgroundColor: colors.background },
            ]}
          >
            <Text
              style={[
                styles.complaintLabel,
                { color: colors.textSecondary },
              ]}
            >
              CHIEF COMPLAINT
            </Text>

            <Text
              style={[
                styles.complaintText,
                { color: colors.textPrimary },
              ]}
            >
              {complaint ||
                "No complaint information provided"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.consultationButton,
            { backgroundColor: colors.primary },
          ]}
          activeOpacity={0.85}
          onPress={() => {
            router.push({
              pathname: "/(doctor)/consultations",
              params: {
                patientId: patientId || "",
                patientName: patientName || "",
              },
            });
          }}
        >
          <Ionicons
            name="videocam-outline"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.consultationButtonText}>
            Start Consultation
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

type DetailRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
  last?: boolean;
};

function DetailRow({
  icon,
  label,
  value,
  colors,
  last = false,
}: DetailRowProps) {
  return (
    <View
      style={[
        styles.detailRow,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.detailIcon,
          { backgroundColor: colors.primaryLight },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>

      <View style={styles.detailTextContainer}>
        <Text
          style={[
            styles.detailLabel,
            { color: colors.textSecondary },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.detailValue,
            { color: colors.textPrimary },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    marginRight: 14,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    marginTop: 3,
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  profileCard: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    marginBottom: 16,
  },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  avatarText: {
    fontSize: 36,
    fontWeight: "800",
  },

  patientName: {
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },

  patientId: {
    fontSize: 13,
    marginTop: 5,
  },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  detailTextContainer: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 12,
    marginBottom: 3,
  },

  detailValue: {
    fontSize: 15,
    fontWeight: "700",
  },

  complaintBox: {
    borderRadius: 15,
    padding: 16,
    marginTop: 14,
  },

  complaintLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  complaintText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },

  consultationButton: {
    minHeight: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  consultationButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});