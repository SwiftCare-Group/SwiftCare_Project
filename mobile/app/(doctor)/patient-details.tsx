import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { goBackOrReplace } from "../../utils/navigation";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import { useTheme } from "../../context/ThemeContext";
import api from "../../services/api";
import { getApiErrorMessage } from "../../utils/errors";

type SymptomAssessment = {
  id: string;
  patientId?: string;
  symptoms?: string;
  severityScore?: number;
  severityLabel?: string;
  aiRecommendedSeverityScore?: number;
  aiStatus?: string;
  isEmergency?: boolean;
  firstAidContent?: string;
  createdAt?: string;
};

const resolveParam = (
  value?: string | string[]
): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

export default function PatientDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const {
    patientId,
    queueEntryId,
    appointmentId,
    symptomAssessmentId,
    patientName,
    phone,
    age,
    severityScore,
    complaint,
    appointmentTime,
    queuePosition,
  } = useLocalSearchParams<{
    patientId?: string;
    queueEntryId?: string;
    appointmentId?: string;
    symptomAssessmentId?: string;
    patientName?: string;
    phone?: string;
    age?: string;
    severityScore?: string;
    complaint?: string;
    appointmentTime?: string;
    queuePosition?: string;
  }>();

  const [starting, setStarting] = useState(false);
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [symptomError, setSymptomError] = useState("");
  const [symptomAssessment, setSymptomAssessment] =
    useState<SymptomAssessment | null>(null);

  const resolvedQueueEntryId = resolveParam(queueEntryId);
  const resolvedAppointmentId = resolveParam(appointmentId);
  const initialSymptomAssessmentId =
    resolveParam(symptomAssessmentId);

  useEffect(() => {
    let mounted = true;

    const getStringId = (value: unknown): string => {
      if (typeof value === "string") {
        return value.trim();
      }

      return value != null ? String(value).trim() : "";
    };

    const loadSymptomAssessment = async () => {
      setSymptomLoading(true);
      setSymptomError("");

      try {
        let linkedAppointmentId = resolvedAppointmentId;
        let linkedSymptomId = initialSymptomAssessmentId;

        /*
         * Do not depend only on navigation parameters. Reload the detailed
         * queue entry so this screen still works after refreshes, deep links,
         * or older versions of the queue screen.
         */
        if (resolvedQueueEntryId) {
          const queueResponse = await api.get(
            `/queue/${resolvedQueueEntryId}`
          );

          const queueDetails = queueResponse.data?.data ??
            queueResponse.data ?? {};

          linkedAppointmentId =
            linkedAppointmentId ||
            getStringId(queueDetails.appointmentId);

          linkedSymptomId =
            linkedSymptomId ||
            getStringId(
              queueDetails.symptomAssessmentId ??
                queueDetails.symptomSubmissionId
            );
        }

        /*
         * Appointment details are a second source of truth when an older
         * queue response does not include the symptom-assessment ID.
         */
        if (!linkedSymptomId && linkedAppointmentId) {
          const appointmentResponse = await api.get(
            `/appointments/${linkedAppointmentId}`
          );

          const appointmentDetails =
            appointmentResponse.data?.data ??
            appointmentResponse.data ?? {};

          linkedSymptomId = getStringId(
            appointmentDetails.symptomAssessmentId ??
              appointmentDetails.symptomSubmissionId
          );
        }

        if (!linkedSymptomId) {
          throw new Error(
            "No symptom assessment is linked to this appointment. Create a new test appointment after submitting symptoms."
          );
        }

        const symptomResponse = await api.get(
          `/symptoms/${linkedSymptomId}`
        );

        const raw = symptomResponse.data?.data ??
          symptomResponse.data ?? {};

        const normalized: SymptomAssessment = {
          id: getStringId(raw.id) || linkedSymptomId,
          patientId: getStringId(raw.patientId) || undefined,
          symptoms:
            raw.symptoms ??
            raw.description ??
            raw.symptomText ??
            undefined,
          severityScore:
            raw.severityScore ??
            raw.patientSeverityScore ??
            undefined,
          severityLabel: raw.severityLabel ?? undefined,
          aiRecommendedSeverityScore:
            raw.aiRecommendedSeverityScore ??
            raw.aiSeverityScore ??
            undefined,
          aiStatus: raw.aiStatus ?? undefined,
          isEmergency: Boolean(
            raw.isEmergency ?? raw.emergency
          ),
          firstAidContent:
            raw.firstAidContent ??
            raw.firstAid ??
            undefined,
          createdAt:
            raw.createdAt ??
            raw.submittedAt ??
            undefined,
        };

        if (mounted) {
          setSymptomAssessment(normalized);
        }
      } catch (error: unknown) {
        if (__DEV__) {
          const apiError = error as any;
          console.warn("[Doctor symptom load failed]", {
            status: apiError?.response?.status,
            url: apiError?.config?.url,
            data: apiError?.response?.data,
            message: apiError?.message,
          });
        }

        if (mounted) {
          setSymptomAssessment(null);
          setSymptomError(
            getApiErrorMessage(error, {
              fallback:
                "The submitted symptoms could not be loaded.",
            })
          );
        }
      } finally {
        if (mounted) {
          setSymptomLoading(false);
        }
      }
    };

    void loadSymptomAssessment();

    return () => {
      mounted = false;
    };
  }, [
    initialSymptomAssessmentId,
    resolvedAppointmentId,
    resolvedQueueEntryId,
  ]);

  const startConsultation = async () => {
    const entryId = resolveParam(queueEntryId);
    if (!entryId) {
      Alert.alert(
        "Unable to start consultation",
        "This patient record does not include a queue entry. Return to the queue and select the patient again."
      );
      return;
    }

    if (starting) {
      return;
    }

    setStarting(true);
    try {
      await api.patch(`/queue/${entryId}/start`);
      router.replace({
        pathname: "/(doctor)/consultation/[queueEntryId]",
        params: {
          queueEntryId: entryId,
          patientId: resolveParam(patientId),
        },
      });
    } catch (error: unknown) {
      Alert.alert(
        "Unable to start consultation",
        getApiErrorMessage(error, {
          fallback: "The consultation could not be started.",
        })
      );
    } finally {
      setStarting(false);
    }
  };

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
          onPress={() => goBackOrReplace(router, '/(doctor)/queue')}
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
                ? `${severityScore}/4`
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

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.symptomHeaderRow}>
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.textPrimary },
                ]}
              >
                Submitted Symptoms
              </Text>

              <Text
                style={[
                  styles.symptomHelperText,
                  { color: colors.textSecondary },
                ]}
              >
                Patient-reported information submitted before booking
              </Text>
            </View>

            {symptomAssessment?.isEmergency ? (
              <View
                style={[
                  styles.emergencyBadge,
                  { backgroundColor: colors.danger },
                ]}
              >
                <Ionicons
                  name="warning"
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.emergencyBadgeText}>
                  Emergency
                </Text>
              </View>
            ) : null}
          </View>

          {symptomLoading ? (
            <View style={styles.symptomLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text
                style={[
                  styles.symptomLoadingText,
                  { color: colors.textSecondary },
                ]}
              >
                Loading symptom assessment...
              </Text>
            </View>
          ) : symptomError ? (
            <View
              style={[
                styles.symptomErrorBox,
                { backgroundColor: colors.background },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={21}
                color={colors.danger}
              />
              <Text
                style={[
                  styles.symptomErrorText,
                  { color: colors.textSecondary },
                ]}
              >
                {symptomError}
              </Text>
            </View>
          ) : symptomAssessment ? (
            <>
              <View
                style={[
                  styles.symptomDescriptionBox,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text
                  style={[
                    styles.complaintLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  PATIENT DESCRIPTION
                </Text>

                <Text
                  style={[
                    styles.complaintText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {symptomAssessment.symptoms ||
                    "No symptom description was provided."}
                </Text>
              </View>

              <View style={styles.symptomScoreRow}>
                <View
                  style={[
                    styles.symptomMetric,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.symptomMetricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Patient severity
                  </Text>
                  <Text
                    style={[
                      styles.symptomMetricValue,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {symptomAssessment.severityScore ?? "—"}/4
                  </Text>
                  <Text
                    style={[
                      styles.symptomMetricCaption,
                      { color: colors.primary },
                    ]}
                  >
                    {symptomAssessment.severityLabel ?? "Not labelled"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.symptomMetric,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.symptomMetricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    AI recommendation
                  </Text>
                  <Text
                    style={[
                      styles.symptomMetricValue,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {symptomAssessment.aiRecommendedSeverityScore ??
                      "—"}/4
                  </Text>
                  <Text
                    style={[
                      styles.symptomMetricCaption,
                      { color: colors.primary },
                    ]}
                  >
                    {symptomAssessment.aiStatus ?? "Unavailable"}
                  </Text>
                </View>
              </View>

              {symptomAssessment.firstAidContent ? (
                <View
                  style={[
                    styles.firstAidBox,
                    { backgroundColor: colors.dangerLight },
                  ]}
                >
                  <Ionicons
                    name="medkit-outline"
                    size={21}
                    color={colors.danger}
                  />

                  <View style={styles.firstAidTextContainer}>
                    <Text
                      style={[
                        styles.firstAidTitle,
                        { color: colors.danger },
                      ]}
                    >
                      First-aid guidance
                    </Text>

                    <Text
                      style={[
                        styles.firstAidText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {symptomAssessment.firstAidContent}
                    </Text>
                  </View>
                </View>
              ) : null}

              <DetailRow
                icon="calendar-outline"
                label="Symptoms submitted"
                value={
                  symptomAssessment.createdAt
                    ? new Date(
                        symptomAssessment.createdAt
                      ).toLocaleString("en-GB")
                    : "Not available"
                }
                colors={colors}
                last
              />
            </>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.consultationButton,
            { backgroundColor: colors.primary },
          ]}
          activeOpacity={0.85}
          onPress={() => void startConsultation()}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="medical-outline"
                size={21}
                color="#FFFFFF"
              />
              <Text style={styles.consultationButtonText}>
                Start Consultation
              </Text>
            </>
          )}
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

  symptomHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  symptomHelperText: {
    maxWidth: 245,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -2,
  },

  emergencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  emergencyBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  symptomLoading: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
  },

  symptomLoadingText: {
    marginTop: 10,
    fontSize: 12,
  },

  symptomErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 14,
    padding: 14,
  },

  symptomErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },

  symptomDescriptionBox: {
    borderRadius: 15,
    padding: 16,
  },

  symptomScoreRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  symptomMetric: {
    flex: 1,
    borderRadius: 14,
    padding: 13,
  },

  symptomMetricLabel: {
    fontSize: 11,
    marginBottom: 5,
  },

  symptomMetricValue: {
    fontSize: 20,
    fontWeight: "800",
  },

  symptomMetricCaption: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
  },

  firstAidBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },

  firstAidTextContainer: {
    flex: 1,
  },

  firstAidTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },

  firstAidText: {
    fontSize: 12,
    lineHeight: 18,
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