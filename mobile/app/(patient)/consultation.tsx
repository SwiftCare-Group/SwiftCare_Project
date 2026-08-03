import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import api from '../../services/api';
import { getPremiumEntitlement } from '../../services/subscription';
import { requestVideoConsultationPermissions } from '../../services/videoPermissions';
import { useTheme, type AppColors } from '../../context/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';
import { getApiErrorMessage } from '../../utils/errors';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';

type ConsultationDoctor = {
  id: string;
  name: string;
  departmentName?: string;
};

type Consultation = {
  id: string;
  doctorName?: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
};

const SCHEDULE_OPTIONS = [
  { label: 'In 1 hour', minutes: 60 },
  { label: 'In 2 hours', minutes: 120 },
  { label: 'Tomorrow', minutes: 1440 },
] as const;

export default function ConsultationScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [doctors, setDoctors] = useState<ConsultationDoctor[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedOffsetMinutes, setSelectedOffsetMinutes] = useState(60);
  const [showBooking, setShowBooking] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [showSession, setShowSession] = useState(false);
  const { mediumTap, successNotification, errorNotification } = useHaptics();

  useRefreshOnFocus(() => fetchData());

  const showUpgradePrompt = () => {
    Alert.alert(
      'Premium required',
      'Online video consultations are available with an active Premium subscription.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'View Plans',
          onPress: () => router.push('/(patient)/profile'),
        },
      ]
    );
  };

  const fetchData = async () => {
    setLoadError(null);

    try {
      const [entitlement, consultationsRes] = await Promise.all([
        getPremiumEntitlement(),
        api.get('/consultations'),
      ]);
      const premium = entitlement.isPremium;

      setIsPremium(premium);
      setConsultations(
        Array.isArray(consultationsRes.data) ? consultationsRes.data : []
      );

      if (premium) {
        const doctorsRes = await api.get('/consultations/doctors');
        setDoctors(Array.isArray(doctorsRes.data) ? doctorsRes.data : []);
      } else {
        setDoctors([]);
        setShowBooking(false);
      }
    } catch (error: unknown) {
      setLoadError(
        getApiErrorMessage(error, {
          fallback:
            'Consultations could not be loaded. Check your connection and try again.',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (booking) {
      return;
    }
    if (!isPremium) {
      showUpgradePrompt();
      return;
    }

    mediumTap();
    if (!selectedDoctor) {
      Alert.alert('Error', 'Please select a doctor');
      return;
    }

    setBooking(true);
    try {
      const scheduledAt = new Date(
        Date.now() + selectedOffsetMinutes * 60_000
      );
      await api.post('/consultations', {
        doctorId: selectedDoctor,
        scheduledAt: scheduledAt.toISOString().slice(0, 19),
      });
      successNotification();
      Alert.alert('Success', 'Consultation booked successfully');
      setShowBooking(false);
      setSelectedDoctor(null);
      setSelectedOffsetMinutes(60);
      await fetchData();
    } catch (error: unknown) {
      errorNotification();
      const message = getApiErrorMessage(error, {
        fallback: 'Failed to book consultation',
      });
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (
        message.toLowerCase().includes('premium') ||
        status === 402 ||
        status === 403
      ) {
        setIsPremium(false);
        showUpgradePrompt();
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = (consultationId: string) => {
    Alert.alert(
      'Cancel consultation?',
      'This scheduled consultation will be cancelled.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Consultation',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(consultationId);
            try {
              await api.put(
                '/consultations/' + consultationId + '/cancel'
              );
              await fetchData();
              Alert.alert(
                'Consultation cancelled',
                'The booking has been cancelled.'
              );
            } catch (error: unknown) {
              Alert.alert(
                'Unable to cancel',
                getApiErrorMessage(error, {
                  fallback: 'The consultation could not be cancelled.',
                })
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const handleJoin = async (consultationId: string) => {
    if (joiningId) {
      return;
    }
    if (!isPremium) {
      showUpgradePrompt();
      return;
    }

    mediumTap();
    setJoiningId(consultationId);
    setSessionError(null);

    try {
      const permissions = await requestVideoConsultationPermissions();
      if (!permissions.granted) {
        Alert.alert(
          'Camera and microphone required',
          permissions.canAskAgain
            ? 'Allow camera and microphone access to join the video consultation.'
            : 'Camera or microphone access is blocked. Enable both permissions in your device settings and try again.'
        );
        return;
      }

      const response = await api.put(
        '/consultations/' + consultationId + '/join'
      );
      const nextSessionUrl = response.data?.sessionUrl;
      if (
        typeof nextSessionUrl !== 'string' ||
        !/^https:\/\//i.test(nextSessionUrl)
      ) {
        throw new Error(
          'The consultation provider returned an invalid session link.'
        );
      }
      setSessionUrl(nextSessionUrl);
      setShowSession(true);
    } catch (error: unknown) {
      Alert.alert(
        'Unable to join session',
        getApiErrorMessage(error, {
          fallback: 'Failed to join the consultation session.',
          conflict:
            'The room opens 15 minutes before the scheduled consultation.',
        })
      );
    } finally {
      setJoiningId(null);
    }
  };
  const isJoinWindowOpen = (consultation: Consultation) =>
    consultation.status === 'IN_PROGRESS' ||
    Date.parse(consultation.scheduledAt) <= Date.now() + 15 * 60_000;

  const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: colors.warning,
    IN_PROGRESS: colors.primary,
    COMPLETED: colors.success,
    CANCELLED: colors.danger,
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError && doctors.length === 0 && consultations.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={44} color={colors.textDisabled} />
        <Text style={styles.loadErrorTitle}>Unable to load consultations</Text>
        <Text style={styles.loadErrorText}>{loadError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            void fetchData();
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Consultations</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                if (!isPremium) {
                  showUpgradePrompt();
                  return;
                }
                setShowBooking(!showBooking);
              }}
            >
              <Ionicons
                name={!isPremium ? 'lock-closed-outline' : showBooking ? 'close' : 'add'}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Live video consultations with doctors</Text>
        </LinearGradient>

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

          {isPremium === false ? (
            <View style={styles.upgradeCard}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
              <View style={styles.upgradeCopy}>
                <Text style={styles.upgradeTitle}>Premium video consultations</Text>
                <Text style={styles.upgradeText}>
                  Upgrade to book or join online appointments. You can still review and cancel existing bookings below.
                </Text>
              </View>
              <TouchableOpacity style={styles.upgradeButton} onPress={showUpgradePrompt}>
                <Text style={styles.upgradeButtonText}>View Plans</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isPremium && showBooking && (
            <View style={styles.bookingCard}>
              <View style={styles.premiumBadge}>
                <Ionicons name="star-outline" size={14} color={colors.primary} />
                <Text style={styles.premiumBadgeText}>Premium Feature</Text>
              </View>
              <Text style={styles.bookingTitle}>Book a Doctor</Text>
              <Text style={styles.bookingSubtitle}>
                Select an available doctor for your online consultation
              </Text>

              {doctors.length === 0 ? (
                <View style={styles.noDoctors}>
                  <Ionicons name="person-outline" size={32} color={colors.textDisabled} />
                  <Text style={styles.noDoctorsText}>No doctors available right now</Text>
                </View>
              ) : (
                doctors.map(doctor => (
                  <TouchableOpacity
                    key={doctor.id}
                    style={[
                      styles.doctorCard,
                      selectedDoctor === doctor.id && styles.doctorCardSelected,
                    ]}
                    onPress={() => setSelectedDoctor(doctor.id)}
                  >
                    <View style={styles.doctorAvatar}>
                      <Ionicons name="person-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.doctorInfo}>
                      <Text style={[
                        styles.doctorName,
                        selectedDoctor === doctor.id && styles.doctorNameSelected,
                      ]}>
                        Dr. {doctor.name}
                      </Text>
                      <Text style={styles.doctorDept}>{doctor.departmentName}</Text>
                    </View>
                    <View style={styles.availableDot} />
                  </TouchableOpacity>
                ))
              )}

              <Text style={styles.scheduleLabel}>Preferred time</Text>
              <View style={styles.scheduleOptions}>
                {SCHEDULE_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.minutes}
                    style={[
                      styles.scheduleOption,
                      selectedOffsetMinutes === option.minutes && styles.scheduleOptionSelected,
                    ]}
                    onPress={() => setSelectedOffsetMinutes(option.minutes)}
                    disabled={booking}
                  >
                    <Text
                      style={[
                        styles.scheduleOptionText,
                        selectedOffsetMinutes === option.minutes && styles.scheduleOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.confirmButton, booking && styles.buttonDisabled]}
                onPress={handleBook}
                disabled={booking}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.confirmButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {booking ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="videocam-outline" size={18} color={colors.white} />
                      <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Your Consultations</Text>

          {consultations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="videocam-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>No consultations yet</Text>
              <Text style={styles.emptySubtext}>
                {isPremium
                  ? 'Book your first online consultation above'
                  : 'An active Premium subscription is required to book online.'}
              </Text>
            </View>
          ) : (
            consultations.map(con => (
              <View key={con.id} style={styles.consultationCard}>
                <View style={styles.conHeader}>
                  <View style={styles.doctorAvatarSmall}>
                    <Ionicons name="person-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.conInfo}>
                    <Text style={styles.conDoctorName}>Dr. {con.doctorName}</Text>
                    <Text style={styles.conTime}>
                      {new Date(con.scheduledAt).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[con.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[con.status] }]}>
                      {con.status}
                    </Text>
                  </View>
                </View>

                {con.notes ? (
                  <Text style={styles.conNotes}>{con.notes}</Text>
                ) : null}

                {(con.status === 'SCHEDULED' || con.status === 'IN_PROGRESS') && (
                  <View style={styles.consultationActions}>
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => {
                        if (!isPremium) {
                          showUpgradePrompt();
                        } else if (!isJoinWindowOpen(con)) {
                          Alert.alert(
                            'Room not open yet',
                            'You can join 15 minutes before the scheduled time.'
                          );
                        } else {
                          void handleJoin(con.id);
                        }
                      }}
                      disabled={joiningId === con.id}
                    >
                      <LinearGradient
                        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                        style={styles.joinButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {joiningId === con.id ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <>
                            <Ionicons
                              name={!isPremium ? 'lock-closed-outline' : 'videocam-outline'}
                              size={16}
                              color={colors.white}
                            />
                            <Text style={styles.joinButtonText}>
                              {!isPremium
                                ? 'Premium Required'
                                : con.status === 'IN_PROGRESS'
                                  ? 'Rejoin Session'
                                  : isJoinWindowOpen(con)
                                    ? 'Join Session'
                                    : 'Opens 15 Min Before'}
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {con.status === 'SCHEDULED' ? (
                      <TouchableOpacity
                        style={styles.cancelConsultationButton}
                        onPress={() => handleCancel(con.id)}
                        disabled={cancellingId === con.id}
                      >
                        {cancellingId === con.id ? (
                          <ActivityIndicator size="small" color={colors.danger} />
                        ) : (
                          <Text style={styles.cancelConsultationText}>Cancel</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showSession}
        animationType="slide"
        onRequestClose={() => {
          setShowSession(false);
          setSessionUrl(null);
          setSessionError(null);
        }}
      >
        <View style={styles.sessionContainer}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>Live Consultation</Text>
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={() => {
                setShowSession(false);
                setSessionUrl(null);
                setSessionError(null);
              }}
            >
              <Text style={styles.leaveButtonText}>Leave</Text>
            </TouchableOpacity>
          </View>
          {sessionError ? (
            <View style={styles.sessionErrorContainer}>
              <Ionicons name="warning-outline" size={42} color={colors.danger} />
              <Text style={styles.sessionErrorTitle}>Video session unavailable</Text>
              <Text style={styles.sessionErrorText}>{sessionError}</Text>
            </View>
          ) : sessionUrl ? (
            <WebView
              source={{ uri: sessionUrl }}
              style={styles.webview}
              originWhitelist={['https://*']}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
              setSupportMultipleWindows={false}
              onError={() => setSessionError('The video consultation page could not be loaded.')}
              onHttpError={event =>
                setSessionError(
                  `The video provider returned status ${event.nativeEvent.statusCode}.`
                )
              }
            />
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.headerGradientStart },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 28 },
  loadErrorTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  loadErrorText: { marginTop: 8, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryButton: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  retryButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  upgradeCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.primary, gap: 12 },
  upgradeCopy: { gap: 4 },
  upgradeTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  upgradeText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  upgradeButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  upgradeButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  bookingCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: colors.border, shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.09, shadowRadius: 12, elevation: 3 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 12 },
  premiumBadgeText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  bookingTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  bookingSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  noDoctors: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noDoctorsText: { fontSize: 14, color: colors.textDisabled },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  doctorCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  doctorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  doctorNameSelected: { color: colors.primary },
  doctorDept: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  availableDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  scheduleLabel: { marginTop: 10, marginBottom: 8, fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  scheduleOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  scheduleOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.background },
  scheduleOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  scheduleOptionText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  scheduleOptionTextSelected: { color: colors.primary },
  confirmButton: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  confirmButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  confirmButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  buttonDisabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: colors.textDisabled, textAlign: 'center' },
  consultationCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  conHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  doctorAvatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  conInfo: { flex: 1 },
  conDoctorName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  conTime: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  conNotes: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 12 },
  consultationActions: { gap: 8 },
  joinButton: { borderRadius: 12, overflow: 'hidden' },
  cancelConsultationButton: { borderRadius: 12, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  cancelConsultationText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  joinButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  joinButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  sessionContainer: { flex: 1, backgroundColor: colors.black },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.headerGradientStart },
  sessionTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  leaveButton: { backgroundColor: colors.danger, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  leaveButtonText: { color: colors.white, fontWeight: '700' },
  webview: { flex: 1 },
  sessionErrorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: colors.background },
  sessionErrorTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  sessionErrorText: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
});