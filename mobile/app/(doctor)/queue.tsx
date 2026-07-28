import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import SwiftCareLogo from '../../components/branding/SwiftCareLogo';

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

const LIVE_REFRESH_INTERVAL_MS = 15000;
const DEFAULT_CONSULTATION_MINUTES = 15;

const getSeverityDetails = (
  score: number,
  label?: string
) => {
  const normalizedLabel = label?.toUpperCase();

  if (
    normalizedLabel === 'EMERGENCY' ||
    normalizedLabel === 'CRITICAL' ||
    score >= 4
  ) {
    return {
      label: 'EMERGENCY',
      color: Colors.danger,
      backgroundColor: `${Colors.danger}18`,
      icon: 'warning' as const,
    };
  }

  if (
    normalizedLabel === 'SEVERE' ||
    normalizedLabel === 'HIGH' ||
    score === 3
  ) {
    return {
      label: 'SEVERE',
      color: Colors.warning,
      backgroundColor: `${Colors.warning}18`,
      icon: 'alert-circle' as const,
    };
  }

  if (
    normalizedLabel === 'MODERATE' ||
    score === 2
  ) {
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
  const normalizedStatus =
    status?.toUpperCase() ?? 'WAITING';

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
  if (!value) {
    return 'Not specified';
  }

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
    return `SC-${patient.patientId
      .slice(0, 6)
      .toUpperCase()}`;
  }

  return 'Not assigned';
};

const getBackendErrorMessage = (
  error: any,
  fallbackMessage: string
) => {
  const responseData = error?.response?.data;

  if (typeof responseData === 'string') {
    return responseData;
  }

  if (typeof responseData?.message === 'string') {
    return responseData.message;
  }

  if (typeof responseData?.error === 'string') {
    return responseData.error;
  }

  if (error?.response?.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (error?.response?.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error?.response?.status === 409) {
    return (
      responseData?.message ??
      'The queue changed before this action could be completed. Refresh and try again.'
    );
  }

  if (!error?.response) {
    return 'Unable to reach the SwiftCare server. Check your connection and try again.';
  }

  return error?.message ?? fallbackMessage;
};

export default function DoctorQueueScreen() {
  const router = useRouter();

  const [departments, setDepartments] = useState<
    Department[]
  >([]);

  const [selectedDept, setSelectedDept] = useState<
    string | null
  >(null);

  const [queue, setQueue] = useState<QueuePatient[]>(
    []
  );

  const [
    loadingDepartments,
    setLoadingDepartments,
  ] = useState(true);

  const [loadingQueue, setLoadingQueue] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [
    processingPatientId,
    setProcessingPatientId,
  ] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const queueRequestInFlightRef = useRef(false);
  const processingPatientIdRef = useRef<string | null>(null);

  useEffect(() => {
    processingPatientIdRef.current = processingPatientId;
  }, [processingPatientId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchQueue = useCallback(
    async (
      departmentId: string,
      options?: {
        showLoader?: boolean;
        force?: boolean;
      }
    ) => {
      const showLoader = options?.showLoader ?? false;
      const force = options?.force ?? false;

      if (queueRequestInFlightRef.current && !force) {
        return;
      }

      queueRequestInFlightRef.current = true;

      try {
        if (showLoader && isMountedRef.current) {
          setLoadingQueue(true);
        }

        const response = await api.get(
          `/departments/${departmentId}/queue`,
          { timeout: 15000 }
        );

        const queueData: QueuePatient[] =
          Array.isArray(response.data)
            ? response.data
            : response.data?.queue ?? [];

        const statusPriority: Record<string, number> = {
          IN_CONSULTATION: 0,
          CALLED: 1,
          WAITING: 2,
          COMPLETED: 3,
          CANCELLED: 4,
        };

        const sortedQueue = [...queueData].sort(
          (first, second) => {
            const firstStatus =
              first.status?.toUpperCase() ?? 'WAITING';
            const secondStatus =
              second.status?.toUpperCase() ?? 'WAITING';

            const statusDifference =
              (statusPriority[firstStatus] ?? 99) -
              (statusPriority[secondStatus] ?? 99);

            if (statusDifference !== 0) {
              return statusDifference;
            }

            return (
              (first.queuePosition ?? Number.MAX_SAFE_INTEGER) -
              (second.queuePosition ?? Number.MAX_SAFE_INTEGER)
            );
          }
        );

        if (isMountedRef.current) {
          setQueue(sortedQueue);
          setErrorMessage('');
        }
      } catch (error: any) {
        if (isMountedRef.current) {
          setErrorMessage(
            getBackendErrorMessage(
              error,
              'Unable to load the patient queue.'
            )
          );
        }
      } finally {
        queueRequestInFlightRef.current = false;

        if (isMountedRef.current) {
          setLoadingQueue(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  const fetchDepartments = useCallback(
    async () => {
      try {
        setLoadingDepartments(true);
        setErrorMessage('');

        const response = await api.get(
          '/departments'
        );

        const departmentData: Department[] =
          Array.isArray(response.data)
            ? response.data
            : response.data?.departments ?? [];

        setDepartments(departmentData);

        if (departmentData.length === 0) {
          setSelectedDept(null);
          setQueue([]);
          return;
        }

        setSelectedDept(currentDepartmentId => {
          const currentDepartmentStillExists =
            departmentData.some(
              department =>
                department.id ===
                currentDepartmentId
            );

          if (currentDepartmentStillExists) {
            return currentDepartmentId;
          }

          return departmentData[0].id;
        });
      } catch (error: any) {
        setErrorMessage(
          getBackendErrorMessage(
            error,
            'Unable to load hospital departments.'
          )
        );
      } finally {
        setLoadingDepartments(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (!selectedDept) {
      return;
    }

    fetchQueue(selectedDept, { showLoader: true });
  }, [fetchQueue, selectedDept]);

  /*
   * Poll only while this screen is focused. The selected-department
   * effect performs the immediate fetch, preventing duplicate calls.
   */
  useFocusEffect(
    useCallback(() => {
      if (!selectedDept) {
        return undefined;
      }

      const intervalId = setInterval(() => {
        if (!processingPatientIdRef.current) {
          fetchQueue(selectedDept);
        }
      }, LIVE_REFRESH_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
      };
    }, [fetchQueue, selectedDept])
  );

  const handleSelectDepartment = useCallback(
    (departmentId: string) => {
      if (
        departmentId === selectedDept ||
        processingPatientId
      ) {
        return;
      }

      setSelectedDept(departmentId);
    },
    [processingPatientId, selectedDept]
  );

  const handleRefresh = useCallback(() => {
    if (!selectedDept) {
      return;
    }

    setRefreshing(true);
    fetchQueue(selectedDept, { force: true });
  }, [fetchQueue, selectedDept]);

  const refreshSelectedDepartment =
    useCallback(async () => {
      if (selectedDept) {
        await fetchQueue(selectedDept, { force: true });
      }
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
                'userRole',
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

  const handleCallPatient = async (
    patient: QueuePatient
  ) => {
    try {
      setProcessingPatientId(patient.id);

      await api.patch(
        `/queue/${patient.id}/call`
      );

      await refreshSelectedDepartment();

      Alert.alert(
        'Patient called',
        `${
          patient.patientName ?? 'The patient'
        } has been called.`
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to call patient',
        getBackendErrorMessage(
          error,
          'The patient could not be called.'
        )
      );

      await refreshSelectedDepartment();
    } finally {
      setProcessingPatientId(null);
    }
  };

  const handleSkipPatient = (
    patient: QueuePatient
  ) => {
    Alert.alert(
      'Skip patient',
      `Move ${
        patient.patientName ?? 'this patient'
      } to the end of the waiting queue?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: async () => {
            try {
              setProcessingPatientId(patient.id);

              await api.patch(
                `/queue/${patient.id}/skip`
              );

              await refreshSelectedDepartment();

              Alert.alert(
                'Patient skipped',
                `${
                  patient.patientName ??
                  'The patient'
                } has been moved to the end of the queue.`
              );
            } catch (error: any) {
              Alert.alert(
                'Unable to skip patient',
                getBackendErrorMessage(
                  error,
                  'The patient could not be skipped.'
                )
              );

              await refreshSelectedDepartment();
            } finally {
              setProcessingPatientId(null);
            }
          },
        },
      ]
    );
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

      await api.patch(
        `/queue/${patient.id}/start`
      );

      await refreshSelectedDepartment();

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
      Alert.alert(
        'Unable to start consultation',
        getBackendErrorMessage(
          error,
          'The consultation could not be started.'
        )
      );

      await refreshSelectedDepartment();
    } finally {
      setProcessingPatientId(null);
    }
  };

  const handleCompleteConsultation = (
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

              await refreshSelectedDepartment();

              Alert.alert(
                'Consultation completed',
                'The patient has been removed from the active queue and the remaining positions have been updated.'
              );
            } catch (error: any) {
              Alert.alert(
                'Unable to complete consultation',
                getBackendErrorMessage(
                  error,
                  'The consultation could not be completed.'
                )
              );

              await refreshSelectedDepartment();
            } finally {
              setProcessingPatientId(null);
            }
          },
        },
      ]
    );
  };

  const handleViewPatient = (
    patient: QueuePatient
  ) => {
    router.push({
      pathname:
        '/(doctor)/patient-details' as any,
      params: {
        patientId: String(
          patient.patientId ?? patient.id ?? ''
        ),
        patientName: String(
          patient.patientName ?? ''
        ),
        age: String(patient.age ?? ''),
        severityScore: String(
          patient.severityScore ?? ''
        ),
        complaint: String(
          patient.chiefComplaint ??
            'No complaint information provided'
        ),
        appointmentTime: String(
          patient.scheduledTime ?? ''
        ),
        queuePosition: String(
          patient.queuePosition ?? ''
        ),
      },
    });
  };

  const selectedDepartment = useMemo(
    () =>
      departments.find(
        department =>
          department.id === selectedDept
      ),
    [departments, selectedDept]
  );

  const waitingPatients = useMemo(
    () =>
      queue.filter(
        patient =>
          (
            patient.status?.toUpperCase() ??
            'WAITING'
          ) === 'WAITING'
      ),
    [queue]
  );

  const calledPatients = useMemo(
    () =>
      queue.filter(
        patient =>
          patient.status?.toUpperCase() ===
          'CALLED'
      ),
    [queue]
  );

  const consultationPatients = useMemo(
    () =>
      queue.filter(
        patient =>
          patient.status?.toUpperCase() ===
          'IN_CONSULTATION'
      ),
    [queue]
  );

  const waitingCount = waitingPatients.length;
  const calledCount = calledPatients.length;

  const consultationCount =
    consultationPatients.length;

  const nextWaitingPatientId =
    waitingPatients[0]?.id;

  const emergencyCount = waitingPatients.filter(
    patient =>
      patient.isEmergency ||
      patient.severityScore >= 4
  ).length;

  const averageWait =
    waitingPatients.length > 0
      ? Math.round(
          waitingPatients.reduce(
            (total, patient, index) => {
              const calculatedWait =
                patient.estimatedWaitMinutes ??
                index *
                  (selectedDepartment
                    ?.averageConsultationMinutes ??
                    DEFAULT_CONSULTATION_MINUTES);

              return total + calculatedWait;
            },
            0
          ) / waitingPatients.length
        )
      : 0;

  const hasBusyPatient =
    calledCount > 0 ||
    consultationCount > 0;

  if (loadingDepartments) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading doctor queue...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <LinearGradient
        colors={[
          Colors.headerGradientStart,
          Colors.headerGradientEnd,
        ]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIdentity}>
            <SwiftCareLogo size={46} compact />
            <View
              style={styles.headerTextContainer}
            >
            <Text style={styles.headerTitle}>
              Patient Queue
            </Text>

            <Text style={styles.headerSubtitle}>
              Live queue ordered by medical
              urgency
            </Text>
            </View>
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
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.departmentContent
          }
        >
          {departments.map(department => {
            const isSelected =
              selectedDept === department.id;

            return (
              <TouchableOpacity
                key={department.id}
                style={[
                  styles.departmentTab,
                  isSelected &&
                    styles.departmentTabActive,
                ]}
                onPress={() =>
                  handleSelectDepartment(
                    department.id
                  )
                }
                disabled={
                  processingPatientId !== null
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.departmentTabText,
                    isSelected &&
                      styles.departmentTabTextActive,
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
        <View style={styles.liveStatusRow}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />

            <Text style={styles.liveText}>
              Live queue
            </Text>
          </View>

          <Text style={styles.liveRefreshText}>
            Refreshes every 15 seconds
          </Text>
        </View>

        <View style={styles.statisticsRow}>
          <View style={styles.statisticCard}>
            <View style={styles.statisticIcon}>
              <Ionicons
                name="people-outline"
                size={20}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.statisticValue}>
              {waitingCount}
            </Text>

            <Text style={styles.statisticLabel}>
              Waiting
            </Text>
          </View>

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

            <Text style={styles.statisticValue}>
              {emergencyCount}
            </Text>

            <Text style={styles.statisticLabel}>
              Emergency
            </Text>
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

            <Text style={styles.statisticValue}>
              {averageWait}m
            </Text>

            <Text style={styles.statisticLabel}>
              Avg. wait
            </Text>
          </View>
        </View>

        <View style={styles.queueHeading}>
          <View style={styles.queueHeadingText}>
            <Text style={styles.queueTitle}>
              {selectedDepartment?.name ??
                'Department'}{' '}
              queue
            </Text>

            <Text style={styles.queueSubtitle}>
              {waitingCount === 1
                ? '1 patient waiting'
                : `${waitingCount} patients waiting`}
            </Text>

            {hasBusyPatient ? (
              <Text
                style={
                  styles.activeQueueSubtitle
                }
              >
                {calledCount > 0
                  ? `${calledCount} called`
                  : ''}

                {calledCount > 0 &&
                consultationCount > 0
                  ? ' • '
                  : ''}

                {consultationCount > 0
                  ? `${consultationCount} in consultation`
                  : ''}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={
              refreshing ||
              processingPatientId !== null
            }
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
              />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={18}
                color={Colors.primary}
              />
            )}

            <Text style={styles.refreshText}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color={Colors.danger}
            />

            <View
              style={styles.errorTextContainer}
            >
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

            <Text
              style={styles.inlineLoadingText}
            >
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

            <Text style={styles.emptyTitle}>
              Queue is clear
            </Text>

            <Text style={styles.emptyText}>
              There are no active patients in
              this department.
            </Text>
          </View>
        ) : (
          queue.map((patient, index) => {
            const severity =
              getSeverityDetails(
                patient.severityScore,
                patient.severityLabel
              );

            const status =
              getStatusDetails(patient.status);

            const normalizedStatus =
              patient.status?.toUpperCase() ??
              'WAITING';

            const isWaiting =
              normalizedStatus === 'WAITING';

            const isCalled =
              normalizedStatus === 'CALLED';

            const isInConsultation =
              normalizedStatus ===
              'IN_CONSULTATION';

            const isNextPatient =
              isWaiting &&
              patient.id ===
                nextWaitingPatientId;

            const isEmergency =
              patient.isEmergency ||
              patient.severityScore >= 4;

            const position =
              isWaiting &&
              patient.queuePosition &&
              patient.queuePosition > 0
                ? patient.queuePosition
                : isWaiting
                  ? index + 1
                  : 0;

            const estimatedWait =
              patient.estimatedWaitMinutes ??
              Math.max(position - 1, 0) *
                (selectedDepartment
                  ?.averageConsultationMinutes ??
                  DEFAULT_CONSULTATION_MINUTES);

            const patientName =
              patient.patientName?.trim() ||
              'Patient name unavailable';

            const isProcessing =
              processingPatientId ===
              patient.id;

            return (
              <View
                key={patient.id}
                style={[
                  styles.patientCard,
                  isNextPatient &&
                    styles.nextPatientCard,
                  isEmergency &&
                    styles.emergencyCard,
                  isCalled &&
                    styles.calledPatientCard,
                  isInConsultation &&
                    styles.consultationPatientCard,
                ]}
              >
                {isNextPatient ? (
                  <View
                    style={
                      styles.nextPatientBanner
                    }
                  >
                    <View
                      style={
                        styles.nextPatientBannerLeft
                      }
                    >
                      <Ionicons
                        name="megaphone-outline"
                        size={15}
                        color={Colors.white}
                      />

                      <Text
                        style={
                          styles.nextPatientBannerText
                        }
                      >
                        NEXT PATIENT
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.nextPatientQueue
                      }
                    >
                      Queue #{position}
                    </Text>
                  </View>
                ) : null}

                {isCalled ? (
                  <View style={styles.calledBanner}>
                    <Ionicons
                      name="megaphone"
                      size={15}
                      color={Colors.white}
                    />

                    <Text
                      style={
                        styles.calledBannerText
                      }
                    >
                      PATIENT CALLED
                    </Text>
                  </View>
                ) : null}

                {isInConsultation ? (
                  <View
                    style={
                      styles.consultationBanner
                    }
                  >
                    <Ionicons
                      name="medical"
                      size={15}
                      color={Colors.white}
                    />

                    <Text
                      style={
                        styles.consultationBannerText
                      }
                    >
                      CONSULTATION IN PROGRESS
                    </Text>
                  </View>
                ) : null}

                {isEmergency ? (
                  <View
                    style={
                      styles.emergencyBanner
                    }
                  >
                    <Ionicons
                      name="warning"
                      size={15}
                      color={Colors.white}
                    />

                    <Text
                      style={
                        styles.emergencyBannerText
                      }
                    >
                      EMERGENCY CASE
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.positionBadge,
                      !isWaiting &&
                        styles.activePositionBadge,
                    ]}
                  >
                    {isWaiting ? (
                      <Text
                        style={styles.positionText}
                      >
                        #{position}
                      </Text>
                    ) : (
                      <Ionicons
                        name={status.icon}
                        size={22}
                        color={status.color}
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.patientInformation
                    }
                  >
                    <Text
                      style={styles.patientName}
                      numberOfLines={1}
                    >
                      {patientName}
                    </Text>

                    <Text
                      style={styles.patientNumber}
                    >
                      ID:{' '}
                      {formatPatientId(patient)}
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
                    <View
                      style={
                        styles.severityLabelRow
                      }
                    >
                      <Ionicons
                        name={severity.icon}
                        size={13}
                        color={severity.color}
                      />

                      <Text
                        style={[
                          styles.severityLabel,
                          {
                            color:
                              severity.color,
                          },
                        ]}
                      >
                        {severity.label}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.severityScore,
                        {
                          color: severity.color,
                        },
                      ]}
                    >
                      {patient.severityScore}/4
                    </Text>
                  </View>
                </View>

                {(patient.age ||
                  patient.gender ||
                  patient.premium) && (
                  <View style={styles.patientTags}>
                    {patient.age ? (
                      <View
                        style={styles.patientTag}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={13}
                          color={
                            Colors.textSecondary
                          }
                        />

                        <Text
                          style={
                            styles.patientTagText
                          }
                        >
                          {patient.age} years
                        </Text>
                      </View>
                    ) : null}

                    {patient.gender ? (
                      <View
                        style={styles.patientTag}
                      >
                        <Ionicons
                          name="person-outline"
                          size={13}
                          color={
                            Colors.textSecondary
                          }
                        />

                        <Text
                          style={
                            styles.patientTagText
                          }
                        >
                          {patient.gender}
                        </Text>
                      </View>
                    ) : null}

                    {patient.premium ? (
                      <View
                        style={styles.premiumTag}
                      >
                        <Ionicons
                          name="diamond-outline"
                          size={13}
                          color={Colors.warning}
                        />

                        <Text
                          style={
                            styles.premiumTagText
                          }
                        >
                          Premium
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <View
                  style={
                    styles.complaintContainer
                  }
                >
                  <Text
                    style={styles.complaintLabel}
                  >
                    Chief complaint
                  </Text>

                  <Text
                    style={styles.complaintText}
                  >
                    {patient.chiefComplaint ||
                      'No complaint information provided'}
                  </Text>
                </View>

                <View style={styles.cardMetadata}>
                  <View style={styles.metadataItem}>
                    <View
                      style={styles.metadataIcon}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={Colors.primary}
                      />
                    </View>

                    <View>
                      <Text
                        style={
                          styles.metadataLabel
                        }
                      >
                        Appointment
                      </Text>

                      <Text
                        style={
                          styles.metadataValue
                        }
                      >
                        {formatAppointmentTime(
                          patient.scheduledTime
                        )}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.metadataDivider
                    }
                  />

                  <View style={styles.metadataItem}>
                    <View
                      style={styles.metadataIcon}
                    >
                      <Ionicons
                        name="hourglass-outline"
                        size={15}
                        color={Colors.primary}
                      />
                    </View>

                    <View>
                      <Text
                        style={
                          styles.metadataLabel
                        }
                      >
                        Estimated wait
                      </Text>

                      <Text
                        style={
                          styles.metadataValue
                        }
                      >
                        {!isWaiting
                          ? isCalled
                            ? 'Called now'
                            : isInConsultation
                              ? 'In progress'
                              : status.label
                          : estimatedWait <= 0
                            ? 'Next'
                            : `${estimatedWait} min`}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <View
                    style={
                      styles.statusContainer
                    }
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            status.color,
                        },
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
                        {
                          color: status.color,
                        },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.queuePositionText
                    }
                  >
                    {isWaiting
                      ? `Queue position ${position}`
                      : isCalled
                        ? 'Patient has been called'
                        : isInConsultation
                          ? 'Consultation active'
                          : status.label}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={
                      styles.viewPatientButton
                    }
                    onPress={() =>
                      handleViewPatient(patient)
                    }
                    activeOpacity={0.8}
                    disabled={isProcessing}
                  >
                    <Ionicons
                      name="person-outline"
                      size={17}
                      color={Colors.primary}
                    />

                    <Text
                      style={
                        styles.viewPatientButtonText
                      }
                    >
                      View patient
                    </Text>
                  </TouchableOpacity>

                  {isWaiting ? (
                    <TouchableOpacity
                      style={[
                        styles.primaryActionButton,
                        (!isNextPatient ||
                          hasBusyPatient) &&
                          styles.disabledButton,
                      ]}
                      onPress={() =>
                        handleCallPatient(patient)
                      }
                      activeOpacity={0.8}
                      disabled={
                        isProcessing ||
                        !isNextPatient ||
                        hasBusyPatient
                      }
                    >
                      {isProcessing ? (
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
                            style={
                              styles.primaryActionButtonText
                            }
                          >
                            Call patient
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}

                  {isCalled ? (
                    <View
                      style={
                        styles.calledActionsContainer
                      }
                    >
                      <TouchableOpacity
                        style={
                          styles.skipPatientButton
                        }
                        onPress={() =>
                          handleSkipPatient(patient)
                        }
                        activeOpacity={0.8}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator
                            size="small"
                            color={Colors.warning}
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="play-skip-forward-outline"
                              size={17}
                              color={Colors.warning}
                            />

                            <Text
                              style={
                                styles.skipPatientButtonText
                              }
                            >
                              Skip
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={
                          styles.primaryActionButton
                        }
                        onPress={() =>
                          handleStartConsultation(
                            patient
                          )
                        }
                        activeOpacity={0.8}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
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
                              style={
                                styles.primaryActionButtonText
                              }
                            >
                              Start
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {isInConsultation ? (
                    <TouchableOpacity
                      style={
                        styles.completeConsultationButton
                      }
                      onPress={() =>
                        handleCompleteConsultation(
                          patient
                        )
                      }
                      activeOpacity={0.8}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
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
                            style={
                              styles.completeConsultationButtonText
                            }
                          >
                            Complete
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
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
    backgroundColor:
      Colors.headerGradientStart,
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

  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
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
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  departmentContent: {
    paddingRight: 15,
  },

  departmentTab: {
    marginRight: 9,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor:
      'rgba(255,255,255,0.16)',
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

  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },

  liveText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.success,
  },

  liveRefreshText: {
    fontSize: 11,
    color: Colors.textSecondary,
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

  queueHeadingText: {
    flex: 1,
    marginRight: 12,
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
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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

  calledPatientCard: {
    borderColor: Colors.warning,
  },

  consultationPatientCard: {
    borderColor: Colors.info,
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

  calledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.warning,
  },

  calledBannerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: Colors.white,
  },

  consultationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.info,
  },

  consultationBannerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
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

  activePositionBadge: {
    backgroundColor: Colors.background,
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
    flexShrink: 1,
    marginLeft: 10,
    fontSize: 11,
    textAlign: 'right',
    color: Colors.textSecondary,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
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

  primaryActionButton: {
    flex: 1.25,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
    backgroundColor: Colors.primary,
  },

  primaryActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },

  disabledButton: {
    opacity: 0.45,
  },

  calledActionsContainer: {
    flex: 1.7,
    flexDirection: 'row',
    gap: 7,
  },

  skipPatientButton: {
    flex: 0.8,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 11,
    backgroundColor: `${Colors.warning}10`,
  },

  skipPatientButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.warning,
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
});
