import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';
import api from '../../services/api';

type Department = {
  id: string;
  name: string;
  averageConsultationMinutes?: number;
};

type QueuePatient = {
  id: string;
  patientId?: string;
  patientName?: string;
  patientNumber?: string;
  age?: number;
  gender?: string;
  chiefComplaint?: string;
  severityScore: number;
  severityLabel?: string;
  scheduledTime?: string;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  status?: string;
  isEmergency?: boolean;
  premium?: boolean;
};

const getSeverityDetails = (score: number, label?: string) => {
  const normalizedLabel = label?.toUpperCase();

  if (normalizedLabel === 'CRITICAL' || score >= 9) {
    return {
      label: 'CRITICAL',
      color: Colors.danger,
      backgroundColor: `${Colors.danger}18`,
      icon: 'warning' as const,
    };
  }

  if (
    normalizedLabel === 'SEVERE' ||
    normalizedLabel === 'HIGH' ||
    score >= 7
  ) {
    return {
      label: 'HIGH',
      color: Colors.warning,
      backgroundColor: `${Colors.warning}18`,
      icon: 'alert-circle' as const,
    };
  }

  if (normalizedLabel === 'MODERATE' || score >= 4) {
    return {
      label: 'MODERATE',
      color: Colors.info,
      backgroundColor: `${Colors.info}18`,
      icon: 'medical' as const,
    };
  }

  return {
    label: 'MILD',
    color: Colors.success,
    backgroundColor: `${Colors.success}18`,
    icon: 'checkmark-circle' as const,
  };
};

const getStatusDetails = (status?: string) => {
  const normalizedStatus = status?.toUpperCase() ?? 'WAITING';

  switch (normalizedStatus) {
    case 'CALLED':
      return {
        label: 'Called',
        color: Colors.warning,
        icon: 'megaphone-outline' as const,
      };

    case 'IN_CONSULTATION':
    case 'IN PROGRESS':
      return {
        label: 'In consultation',
        color: Colors.info,
        icon: 'medical-outline' as const,
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        color: Colors.success,
        icon: 'checkmark-circle-outline' as const,
      };

    case 'CANCELLED':
      return {
        label: 'Cancelled',
        color: Colors.danger,
        icon: 'close-circle-outline' as const,
      };

    default:
      return {
        label: 'Waiting',
        color: Colors.primary,
        icon: 'time-outline' as const,
      };
  }
};

const formatAppointmentTime = (value?: string) => {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPatientId = (patient: QueuePatient) => {
  if (patient.patientNumber) {
    return patient.patientNumber;
  }

  if (patient.patientId) {
    return `SC-${patient.patientId.slice(0, 6).toUpperCase()}`;
  }

  return 'Not assigned';
};

export default function DoctorQueueScreen() {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueuePatient[]>([]);

  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingPatientId, setProcessingPatientId] =
  useState<string | null>(null);

  const fetchQueue = useCallback(
    async (departmentId: string, showLoader = false) => {
      try {
        if (showLoader) {
          setLoadingQueue(true);
        }

        setErrorMessage('');

        const response = await api.get(
          `/departments/${departmentId}/queue`
        );

        const queueData = Array.isArray(response.data)
          ? response.data
          : response.data?.queue ?? [];

        setQueue(queueData);
      } catch (error: any) {
        console.error(
          'Failed to fetch doctor queue:',
          error?.response?.data ?? error?.message
        );

        setErrorMessage(
          error?.response?.data?.message ??
            'Unable to load the patient queue. Pull down to try again.'
        );
      } finally {
        setLoadingQueue(false);
        setRefreshing(false);
      }
    },
    []
  );

  const fetchDepartments = useCallback(async () => {
    try {
      setLoadingDepartments(true);
      setErrorMessage('');

      const response = await api.get('/departments');

      const departmentData: Department[] = Array.isArray(response.data)
        ? response.data
        : response.data?.departments ?? [];

      setDepartments(departmentData);

      if (departmentData.length > 0) {
        const firstDepartmentId = departmentData[0].id;

        setSelectedDept(firstDepartmentId);
        await fetchQueue(firstDepartmentId);
      } else {
        setQueue([]);
      }
    } catch (error: any) {
      console.error(
        'Failed to fetch departments:',
        error?.response?.data ?? error?.message
      );

      setErrorMessage(
        error?.response?.data?.message ??
          'Unable to load hospital departments.'
      );
    } finally {
      setLoadingDepartments(false);
    }
  }, [fetchQueue]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (!selectedDept) return;

    const interval = setInterval(() => {
      fetchQueue(selectedDept);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchQueue, selectedDept]);

  const handleSelectDepartment = async (departmentId: string) => {
    if (departmentId === selectedDept) return;

    setSelectedDept(departmentId);
    await fetchQueue(departmentId, true);
  };

  const handleRefresh = useCallback(() => {
    if (!selectedDept) return;

    setRefreshing(true);
    fetchQueue(selectedDept);
  }, [fetchQueue, selectedDept]);

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out of SwiftCare?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'accessToken',
                'refreshToken',
              ]);

              router.replace('/(auth)/login');
            } catch {
              Alert.alert(
                'Logout failed',
                'SwiftCare could not log you out. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

const handleCallPatient = async (patient: QueuePatient) => {
  try {
    setProcessingPatientId(patient.id);

    await api.patch(`/queue/${patient.id}/call`);

    if (selectedDept) {
      await fetchQueue(selectedDept);
    }

    Alert.alert(
      'Patient called',
      `${patient.patientName ?? 'The patient'} has been called.`
    );
} catch (error: any) {
  console.error('CALL PATIENT ERROR:', {
    status: error?.response?.status,
    data: error?.response?.data,
    message: error?.message,
    url: error?.config?.url,
  });

  const backendMessage =
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.response?.data ??
    error?.message ??
    'Please try again.';

  Alert.alert(
    'Unable to call patient',
    typeof backendMessage === 'string'
      ? backendMessage
      : JSON.stringify(backendMessage)
  );
} finally {
    setProcessingPatientId(null);
  }
};

const handleStartConsultation = async (
  patient: QueuePatient
) => {
  if (!patient.id) {
    Alert.alert(
      'Unable to start consultation',
      'The queue entry ID is missing.'
    );
    return;
  }

  try {
    setProcessingPatientId(patient.id);

    await api.patch(`/queue/${patient.id}/start`);

    router.push({
      pathname:
        '/(doctor)/consultation/[queueEntryId]' as any,
      params: {
        queueEntryId: String(patient.id),
        patientId: patient.patientId
          ? String(patient.patientId)
          : '',
      },
    });
  } catch (error: any) {
    console.error('START CONSULTATION ERROR:', {
      queueEntryId: patient.id,
      status: error?.response?.status,
      data: error?.response?.data,
      message: error?.message,
      url: error?.config?.url,
    });

    Alert.alert(
      'Unable to start consultation',
      error?.response?.data?.message ??
        error?.response?.data?.error ??
        'An unexpected error occurred.'
    );
  } finally {
    setProcessingPatientId(null);
  }
};const handleCompleteConsultation = (
  patient: QueuePatient
) => {
  Alert.alert(
    'Complete consultation',
    `Finish the consultation for ${
      patient.patientName ?? 'this patient'
    }?`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            setProcessingPatientId(patient.id);

            await api.patch(
              `/queue/${patient.id}/complete`
            );

            if (selectedDept) {
              await fetchQueue(selectedDept);
            }

            Alert.alert(
              'Consultation completed',
              'The patient has been removed and the next patient is ready.'
            );
          } catch (error: any) {
            Alert.alert(
              'Unable to complete consultation',
              error?.response?.data?.message ??
                'Please try again.'
            );
          } finally {
            setProcessingPatientId(null);
          }
        },
      },
    ]
  );
};
const handleViewPatient = (patient: any) => {
  router.push({
    pathname: "/(doctor)/patient-details",
    params: {
      patientId: String(patient.patientId ?? patient.id ?? ""),
      patientName: String(patient.patientName ?? patient.name ?? ""),
      phone: String(patient.phone ?? ""),
      age: String(patient.age ?? ""),
      severityScore: String(patient.severityScore ?? ""),
      complaint: String(
        patient.chiefComplaint ??
        patient.complaint ??
        "No complaint information provided"
      ),
      appointmentTime: String(
        patient.appointmentTime ??
        patient.scheduledTime ??
        ""
      ),
      queuePosition: String(
        patient.queuePosition ??
        patient.position ??
        ""
      ),
    },
  });
};
  const selectedDepartment = departments.find(
    department => department.id === selectedDept
  );
  const waitingPatients = queue.filter(
  patient =>
    (patient.status?.toUpperCase() ?? 'WAITING') === 'WAITING'
);

const calledPatients = queue.filter(
  patient => patient.status?.toUpperCase() === 'CALLED'
);

const consultationPatients = queue.filter(
  patient =>
    patient.status?.toUpperCase() === 'IN_CONSULTATION'
);

const waitingCount = waitingPatients.length;
const calledCount = calledPatients.length;
const consultationCount = consultationPatients.length;
const nextWaitingPatientId = waitingPatients[0]?.id;


const criticalCount = waitingPatients.filter(
  patient => patient.isEmergency || patient.severityScore >= 9
).length;
const averageWait =
  waitingPatients.length > 0
    ? Math.round(
        waitingPatients.reduce((total, patient, index) => {
          const calculatedWait =
            patient.estimatedWaitMinutes ??
            index *
              (selectedDepartment?.averageConsultationMinutes ?? 15);

          return total + calculatedWait;
        }, 0) / waitingPatients.length
      )
    : 0;
  if (loadingDepartments) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading doctor queue...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[
          Colors.headerGradientStart,
          Colors.headerGradientEnd,
        ]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Patient Queue</Text>

            <Text style={styles.headerSubtitle}>
              Ordered by medical urgency
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={Colors.white}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.departmentContent}
        >
          {departments.map(department => {
            const isSelected = selectedDept === department.id;

            return (
              <TouchableOpacity
                key={department.id}
                style={[
                  styles.departmentTab,
                  isSelected && styles.departmentTabActive,
                ]}
                onPress={() =>
                  handleSelectDepartment(department.id)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.departmentTabText,
                    isSelected && styles.departmentTabTextActive,
                  ]}
                >
                  {department.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.statisticsRow}>
          <View style={styles.statisticCard}>
            <View style={styles.statisticIcon}>
              <Ionicons
                name="people-outline"
                size={20}
                color={Colors.primary}
              />
            </View>

<Text style={styles.statisticValue}>{waitingCount}</Text>
<Text style={styles.statisticLabel}>Waiting</Text>          </View>

          <View style={styles.statisticCard}>
            <View
              style={[
                styles.statisticIcon,
                styles.criticalStatisticIcon,
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={20}
                color={Colors.danger}
              />
            </View>

            <Text style={styles.statisticValue}>{criticalCount}</Text>
            <Text style={styles.statisticLabel}>Critical</Text>
          </View>

          <View style={styles.statisticCard}>
            <View
              style={[
                styles.statisticIcon,
                styles.waitStatisticIcon,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={Colors.warning}
              />
            </View>

            <Text style={styles.statisticValue}>{averageWait}m</Text>
            <Text style={styles.statisticLabel}>Avg. wait</Text>
          </View>
        </View>

        <View style={styles.queueHeading}>
          <View>
            <Text style={styles.queueTitle}>
              {selectedDepartment?.name ?? 'Department'} queue
            </Text>

<Text style={styles.queueSubtitle}>
  {waitingCount === 1
    ? '1 patient waiting'
    : `${waitingCount} patients waiting`}
</Text>
{calledCount > 0 || consultationCount > 0 ? (
  <Text style={styles.activeQueueSubtitle}>
    {calledCount > 0 ? `${calledCount} called` : ''}
    {calledCount > 0 && consultationCount > 0 ? ' • ' : ''}
    {consultationCount > 0
      ? `${consultationCount} in consultation`
      : ''}
  </Text>
) : null}
      </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={Colors.primary}
            />

            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color={Colors.danger}
            />

            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>
                Queue could not be loaded
              </Text>

              <Text style={styles.errorMessage}>
                {errorMessage}
              </Text>
            </View>
          </View>
        ) : null}

        {loadingQueue && !refreshing ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator
              size="small"
              color={Colors.primary}
            />

            <Text style={styles.inlineLoadingText}>
              Updating queue...
            </Text>
          </View>
        ) : null}

        {!loadingQueue && queue.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={46}
                color={Colors.success}
              />
            </View>

            <Text style={styles.emptyTitle}>Queue is clear</Text>

            <Text style={styles.emptyText}>
              There are no pending patients in this department.
            </Text>
          </View>
        ) : (
          queue.map((patient, index) => {
            const severity = getSeverityDetails(
              patient.severityScore,
              patient.severityLabel
            );

            const status = getStatusDetails(patient.status);

const position =
  patient.queuePosition && patient.queuePosition > 0
    ? patient.queuePosition
    : index + 1;
            const estimatedWait =
              patient.estimatedWaitMinutes ??
              index *
                (selectedDepartment?.averageConsultationMinutes ?? 15);

            const patientName =
              patient.patientName?.trim() || 'Patient name unavailable';

const normalizedStatus =
  patient.status?.toUpperCase() ?? 'WAITING';

const isWaiting = normalizedStatus === 'WAITING';

const isNextPatient =
  isWaiting && patient.id === nextWaitingPatientId;
            return (
              <View
                key={patient.id}
                style={[
                  styles.patientCard,
                  isNextPatient && styles.nextPatientCard,
                  (patient.isEmergency ||
                    patient.severityScore >= 9) &&
                    styles.emergencyCard,
                ]}
              >
                {isNextPatient ? (
                  <View style={styles.nextPatientBanner}>
                    <View style={styles.nextPatientBannerLeft}>
                      <Ionicons
                        name="megaphone-outline"
                        size={15}
                        color={Colors.white}
                      />

                      <Text style={styles.nextPatientBannerText}>
                        NEXT PATIENT
                      </Text>
                    </View>

                    <Text style={styles.nextPatientQueue}>
                      Queue #{position}
                    </Text>
                  </View>
                ) : null}

                {patient.isEmergency ? (
                  <View style={styles.emergencyBanner}>
                    <Ionicons
                      name="warning"
                      size={15}
                      color={Colors.white}
                    />

                    <Text style={styles.emergencyBannerText}>
                      EMERGENCY CASE
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardTopRow}>
                  <View style={styles.positionBadge}>
                    <Text style={styles.positionText}>
                      #{position}
                    </Text>
                  </View>

                  <View style={styles.patientInformation}>
                    <Text
                      style={styles.patientName}
                      numberOfLines={1}
                    >
                      {patientName}
                    </Text>

                    <Text style={styles.patientNumber}>
                      ID: {formatPatientId(patient)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.severityBadge,
                      {
                        backgroundColor:
                          severity.backgroundColor,
                      },
                    ]}
                  >
                    <View style={styles.severityLabelRow}>
                      <Ionicons
                        name={severity.icon}
                        size={13}
                        color={severity.color}
                      />

                      <Text
                        style={[
                          styles.severityLabel,
                          { color: severity.color },
                        ]}
                      >
                        {severity.label}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.severityScore,
                        { color: severity.color },
                      ]}
                    >
                      {patient.severityScore}/10
                    </Text>
                  </View>
                </View>

                {(patient.age ||
                  patient.gender ||
                  patient.premium) && (
                  <View style={styles.patientTags}>
                    {patient.age ? (
                      <View style={styles.patientTag}>
                        <Ionicons
                          name="calendar-outline"
                          size={13}
                          color={Colors.textSecondary}
                        />

                        <Text style={styles.patientTagText}>
                          {patient.age} years
                        </Text>
                      </View>
                    ) : null}

                    {patient.gender ? (
                      <View style={styles.patientTag}>
                        <Ionicons
                          name="person-outline"
                          size={13}
                          color={Colors.textSecondary}
                        />

                        <Text style={styles.patientTagText}>
                          {patient.gender}
                        </Text>
                      </View>
                    ) : null}

                    {patient.premium ? (
                      <View style={styles.premiumTag}>
                        <Ionicons
                          name="diamond-outline"
                          size={13}
                          color={Colors.warning}
                        />

                        <Text style={styles.premiumTagText}>
                          Premium
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <View style={styles.complaintContainer}>
                  <Text style={styles.complaintLabel}>
                    Chief complaint
                  </Text>

                  <Text style={styles.complaintText}>
                    {patient.chiefComplaint ||
                      'No complaint information provided'}
                  </Text>
                </View>

                <View style={styles.cardMetadata}>
                  <View style={styles.metadataItem}>
                    <View style={styles.metadataIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={Colors.primary}
                      />
                    </View>

                    <View>
                      <Text style={styles.metadataLabel}>
                        Appointment
                      </Text>

                      <Text style={styles.metadataValue}>
                        {formatAppointmentTime(
                          patient.scheduledTime
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metadataDivider} />

                  <View style={styles.metadataItem}>
                    <View style={styles.metadataIcon}>
                      <Ionicons
                        name="hourglass-outline"
                        size={15}
                        color={Colors.primary}
                      />
                    </View>

                    <View>
                      <Text style={styles.metadataLabel}>
                        Estimated wait
                      </Text>

<Text style={styles.metadataValue}>
  {!isWaiting
    ? normalizedStatus === 'CALLED'
      ? 'Called'
      : normalizedStatus === 'IN_CONSULTATION'
        ? 'In progress'
        : status.label
    : estimatedWait <= 0
      ? 'Next'
      : `${estimatedWait} min`}
</Text>                    </View>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: status.color },
                      ]}
                    />

                    <Ionicons
                      name={status.icon}
                      size={15}
                      color={status.color}
                    />

                    <Text
                      style={[
                        styles.statusText,
                        { color: status.color },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>

<Text style={styles.queuePositionText}>
  {isWaiting
    ? `Queue position ${position}`
    : normalizedStatus === 'CALLED'
      ? 'Patient has been called'
      : normalizedStatus === 'IN_CONSULTATION'
        ? 'Consultation active'
        : status.label}
</Text>                </View>

<View style={styles.actionRow}>
  <TouchableOpacity
    style={styles.viewPatientButton}
    onPress={() => handleViewPatient(patient)}
    activeOpacity={0.8}
    disabled={processingPatientId === patient.id}
  >
    <Ionicons
      name="person-outline"
      size={17}
      color={Colors.primary}
    />

    <Text style={styles.viewPatientButtonText}>
      View patient
    </Text>
  </TouchableOpacity>

  {patient.status?.toUpperCase() === 'WAITING' ? (
    <TouchableOpacity
      style={styles.startConsultationButton}
      onPress={() => handleCallPatient(patient)}
      activeOpacity={0.8}
      disabled={
        processingPatientId === patient.id ||
        !isNextPatient
      }
    >
      {processingPatientId === patient.id ? (
        <ActivityIndicator
          size="small"
          color={Colors.white}
        />
      ) : (
        <>
          <Ionicons
            name="megaphone-outline"
            size={18}
            color={Colors.white}
          />

          <Text
            style={styles.startConsultationButtonText}
          >
            Call patient
          </Text>
        </>
      )}
    </TouchableOpacity>
  ) : null}

  {patient.status?.toUpperCase() === 'CALLED' ? (
    <TouchableOpacity
      style={styles.startConsultationButton}
      onPress={() =>
        handleStartConsultation(patient)
      }
      activeOpacity={0.8}
      disabled={processingPatientId === patient.id}
    >
      {processingPatientId === patient.id ? (
        <ActivityIndicator
          size="small"
          color={Colors.white}
        />
      ) : (
        <>
          <Ionicons
            name="play-circle-outline"
            size={18}
            color={Colors.white}
          />

          <Text
            style={styles.startConsultationButtonText}
          >
            Start consultation
          </Text>
        </>
      )}
    </TouchableOpacity>
  ) : null}

  {patient.status?.toUpperCase() ===
  'IN_CONSULTATION' ? (
    <TouchableOpacity
      style={styles.completeConsultationButton}
      onPress={() =>
        handleCompleteConsultation(patient)
      }
      activeOpacity={0.8}
      disabled={processingPatientId === patient.id}
    >
      {processingPatientId === patient.id ? (
        <ActivityIndicator
          size="small"
          color={Colors.white}
        />
      ) : (
        <>
          <Ionicons
            name="checkmark-done-outline"
            size={18}
            color={Colors.white}
          />

          <Text
            style={styles.completeConsultationButtonText}
          >
            Complete consultation
          </Text>
        </>
      )}
    </TouchableOpacity>
  ) : null}
</View>              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.headerGradientStart,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 18,
    paddingBottom: 50,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  headerTextContainer: {
    flex: 1,
    marginRight: 15,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: Colors.white,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
  },

  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  departmentContent: {
    paddingRight: 15,
  },

  departmentTab: {
    marginRight: 9,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  departmentTabActive: {
    backgroundColor: Colors.white,
  },

  departmentTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
  },

  departmentTabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },

  statisticsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },

  statisticCard: {
    flex: 1,
    minHeight: 112,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    backgroundColor: Colors.surface,
  },

  statisticIcon: {
    width: 34,
    height: 34,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  criticalStatisticIcon: {
    backgroundColor: `${Colors.danger}12`,
  },

  waitStatisticIcon: {
    backgroundColor: `${Colors.warning}14`,
  },

  statisticValue: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  statisticLabel: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  queueHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  queueTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  queueSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activeQueueSubtitle: {
  marginTop: 3,
  fontSize: 11,
  fontWeight: '700',
  color: Colors.primary,
},

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },

  refreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  errorCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: `${Colors.danger}40`,
    borderRadius: 13,
    backgroundColor: `${Colors.danger}0D`,
  },

  errorTextContainer: {
    flex: 1,
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
  },

  errorMessage: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },

  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 16,
  },

  inlineLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 70,
  },

  emptyIcon: {
    width: 88,
    height: 88,
    marginBottom: 17,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successLight,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.textSecondary,
  },

  patientCard: {
    marginBottom: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 17,
    backgroundColor: Colors.surface,
  },

  nextPatientCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },

  emergencyCard: {
    borderColor: Colors.danger,
  },

  nextPatientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    backgroundColor: Colors.primary,
  },

  nextPatientBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  nextPatientBannerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Colors.white,
  },

  nextPatientQueue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },

  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.danger,
  },

  emergencyBannerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: Colors.white,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  positionBadge: {
    width: 45,
    height: 45,
    marginRight: 12,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  positionText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },

  patientInformation: {
    flex: 1,
    marginRight: 10,
  },

  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  patientNumber: {
    marginTop: 3,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  severityBadge: {
    minWidth: 79,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
  },

  severityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  severityLabel: {
    fontSize: 9,
    fontWeight: '800',
  },

  severityScore: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
  },

  patientTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 13,
  },

  patientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: Colors.background,
  },

  patientTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: `${Colors.warning}14`,
  },

  premiumTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
  },

  complaintContainer: {
    marginTop: 14,
    padding: 12,
    borderRadius: 11,
    backgroundColor: Colors.background,
  },

  complaintLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: Colors.textDisabled,
  },

  complaintText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  cardMetadata: {
    flexDirection: 'row',
    marginTop: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },

  metadataItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  metadataIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  metadataLabel: {
    fontSize: 10,
    color: Colors.textDisabled,
  },

  metadataValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  metadataDivider: {
    width: 1,
    marginHorizontal: 10,
    backgroundColor: Colors.border,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  queuePositionText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 15,
  },

  viewPatientButton: {
    flex: 0.9,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 11,
    backgroundColor: Colors.surface,
  },

  viewPatientButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  startConsultationButton: {
    flex: 1.25,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
    backgroundColor: Colors.primary,
  },

  startConsultationButtonSecondary: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  startConsultationButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  completeConsultationButton: {
  flex: 1.25,
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderRadius: 11,
  backgroundColor: Colors.success,
},

completeConsultationButtonText: {
  fontSize: 12,
  fontWeight: '800',
  color: Colors.white,
},

  startConsultationButtonTextSecondary: {
    color: Colors.primary,
  },
});