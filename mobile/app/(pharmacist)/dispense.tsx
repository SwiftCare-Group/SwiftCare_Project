import { useTheme, type AppColors } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SwiftCareLogo from '../../components/branding/SwiftCareLogo';
import { Colors } from '../../constants/colors';
import api, { logoutSession } from '../../services/api';
import { getApiErrorMessage } from '../../utils/errors';

const PHARMACY_NAME_KEY = 'swiftcarePharmacyName';
const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

type DispensationStatus = 'PENDING' | 'DISPENSED' | 'UNAVAILABLE';

type DispensationRecord = {
  id?: string;
  drugName: string;
  status?: DispensationStatus;
};

type Prescription = {
  id: string;
  issuedAt?: string;
  drugs?: string[];
  dispensationRecords?: DispensationRecord[];
};

const extractPrescriptionId = (rawValue: string): string | null => {
  const raw = rawValue.trim();
  if (!raw) {
    return null;
  }

  const directMatch = raw.match(UUID_PATTERN)?.[0];
  if (directMatch) {
    return directMatch;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of ['prescriptionId', 'id', 'reference']) {
      const value = parsed[key];
      if (typeof value === 'string') {
        const match = value.match(UUID_PATTERN)?.[0];
        if (match) {
          return match;
        }
      }
    }
  } catch {
    // The QR payload may be a URL or plain prescription ID.
  }

  try {
    const decoded = decodeURIComponent(raw);
    return decoded.match(UUID_PATTERN)?.[0] ?? null;
  } catch {
    return null;
  }
};

const getHttpStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

export default function DispenseScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [qrCode, setQrCode] = useState('');
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [remaining, setRemaining] = useState<DispensationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState<string | null>(null);
  const [pharmacyName, setPharmacyName] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PHARMACY_NAME_KEY)
      .then(value => {
        if (value) {
          setPharmacyName(value);
        }
      })
      .catch(() => undefined);
  }, []);

  const loadRemaining = async (prescriptionId: string) => {
    const response = await api.get(`/prescriptions/${prescriptionId}/remaining`);
    setRemaining(Array.isArray(response.data) ? response.data : []);
  };

  const lookupPrescription = async (candidate?: string) => {
    if (loading) {
      return;
    }

    const enteredValue = (candidate ?? qrCode).trim();
    if (!enteredValue) {
      Alert.alert(
        'Prescription code required',
        'Scan a SwiftCare prescription QR code or enter the prescription UUID.',
      );
      return;
    }

    const extractedId = extractPrescriptionId(enteredValue);
    setLoading(true);
    setQrCode(extractedId ?? enteredValue);

    try {
      let response;

      try {
        // QR codes may contain an opaque lookup token or a structured payload.
        // Preserve the complete scanned value and use the backend's QR lookup endpoint.
        response = await api.post<Prescription>('/prescriptions/lookup', {
          code: enteredValue,
        });
      } catch (lookupError: unknown) {
        // Manual entry commonly uses the prescription UUID. If the QR lookup
        // endpoint does not recognize it, fall back to the protected UUID route.
        if (getHttpStatus(lookupError) === 404 && extractedId) {
          response = await api.get<Prescription>(
            `/prescriptions/${extractedId}`,
          );
        } else {
          throw lookupError;
        }
      }

      if (!response.data?.id) {
        throw new Error('The prescription response is incomplete.');
      }

      setQrCode(response.data.id);
      setPrescription(response.data);
      await loadRemaining(response.data.id);
    } catch (error: unknown) {
      setPrescription(null);
      setRemaining([]);
      Alert.alert(
        'Prescription unavailable',
        getApiErrorMessage(error, {
          fallback: 'The prescription could not be loaded.',
          notFound:
            'This QR code does not match a prescription in SwiftCare. Ask the patient to refresh the prescription QR code and scan it again.',
          forbidden: 'You are not authorized to access this prescription.',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera permission required',
          'Allow camera access in your device settings to scan prescription QR codes.',
        );
        return;
      }
    }

    setScannerLocked(false);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = (scan: BarcodeScanningResult) => {
    if (scannerLocked) {
      return;
    }

    const scannedValue = scan.data?.trim();
    if (!scannedValue) {
      return;
    }

    setScannerLocked(true);
    setScannerVisible(false);
    setQrCode(extractPrescriptionId(scannedValue) ?? scannedValue);

    // Let the camera modal finish closing before presenting any lookup result
    // or alert. This prevents the black scanner background from remaining visible.
    setTimeout(() => {
      void lookupPrescription(scannedValue);
    }, 350);
  };

  const handleDispense = async (
    drugName: string,
    status: Exclude<DispensationStatus, 'PENDING'>,
  ) => {
    if (!prescription || dispensing) {
      return;
    }

    const cleanedPharmacyName = pharmacyName.trim();
    if (!cleanedPharmacyName) {
      Alert.alert('Pharmacy required', 'Enter the pharmacy name before dispensing.');
      return;
    }

    setDispensing(drugName);

    try {
      await AsyncStorage.setItem(PHARMACY_NAME_KEY, cleanedPharmacyName);
      await api.patch(`/prescriptions/${prescription.id}/dispense`, {
        drugName,
        status,
        pharmacyName: cleanedPharmacyName,
      });
      await loadRemaining(prescription.id);

      Alert.alert(
        'Prescription updated',
        status === 'DISPENSED'
          ? `${drugName} was marked as dispensed.`
          : `${drugName} was marked as unavailable.`,
      );
    } catch (error: unknown) {
      Alert.alert(
        'Update failed',
        getApiErrorMessage(error, {
          fallback: 'The medication status could not be updated.',
          conflict: 'This medication has already been processed. Refresh the prescription.',
          validation: 'Review the pharmacy and medication details and try again.',
        }),
      );
    } finally {
      setDispensing(null);
    }
  };

  const resetLookup = () => {
    setPrescription(null);
    setRemaining([]);
    setQrCode('');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logoutSession();
          router.replace('/(auth)/staff-login');
        },
      },
    ]);
  };

  const formattedIssuedDate = (() => {
    if (!prescription?.issuedAt) {
      return 'Date unavailable';
    }

    const date = new Date(prescription.issuedAt);
    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  })();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIdentity}>
            <SwiftCareLogo size={46} compact />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Dispense Medication</Text>
              <Text style={styles.headerSubtitle}>
                Scan or enter a prescription ID
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {!prescription ? (
            <View style={styles.lookupCard}>
              <View style={styles.lookupIcon}>
                <Ionicons name="qr-code-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.lookupTitle}>Scan or Enter Prescription ID</Text>
              <Text style={styles.lookupSubtitle}>
                Scan the patient&apos;s QR code or enter the complete prescription UUID.
              </Text>

              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => void openScanner()}
                disabled={loading}
              >
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
                <Text style={styles.scanButtonText}>Scan QR Code</Text>
              </TouchableOpacity>

              <View style={styles.orRow}>
                <View style={styles.orDivider} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orDivider} />
              </View>

              <Text style={styles.label}>Prescription ID</Text>
              <TextInput
                style={styles.input}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                placeholderTextColor={colors.textDisabled}
                value={qrCode}
                onChangeText={setQrCode}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="search"
                onSubmitEditing={() => void lookupPrescription()}
              />

              <TouchableOpacity
                style={[styles.lookupButton, loading && styles.buttonDisabled]}
                onPress={() => void lookupPrescription()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="search-outline" size={18} color={colors.white} />
                    <Text style={styles.lookupButtonText}>Look Up Prescription</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.prescCard}>
                <View style={styles.prescHeader}>
                  <View style={styles.rxBadge}>
                    <Text style={styles.rxText}>Rx</Text>
                  </View>
                  <View style={styles.prescInfo}>
                    <Text style={styles.prescId}>
                      #{prescription.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={styles.prescDate}>{formattedIssuedDate}</Text>
                  </View>
                  <TouchableOpacity style={styles.newScanBtn} onPress={resetLookup}>
                    <Text style={styles.newScanText}>New Scan</Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.statusRow,
                    {
                      backgroundColor:
                        remaining.length === 0
                          ? colors.successLight
                          : colors.warningLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      remaining.length === 0
                        ? 'checkmark-circle-outline'
                        : 'time-outline'
                    }
                    size={16}
                    color={remaining.length === 0 ? colors.success : colors.warning}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          remaining.length === 0 ? colors.success : colors.warning,
                      },
                    ]}
                  >
                    {remaining.length === 0
                      ? 'Fully processed'
                      : `${remaining.length} drug(s) pending`}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Pharmacy Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. KNUST Hospital Pharmacy"
                placeholderTextColor={colors.textDisabled}
                value={pharmacyName}
                onChangeText={setPharmacyName}
                editable={!dispensing}
                returnKeyType="done"
              />

              <Text style={styles.sectionTitle}>Drugs to Dispense</Text>

              {remaining.length === 0 ? (
                <View style={styles.allDoneCard}>
                  <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                  <Text style={styles.allDoneText}>All drugs have been processed</Text>
                </View>
              ) : (
                remaining.map(record => (
                  <View key={record.id ?? record.drugName} style={styles.drugCard}>
                    <View style={styles.drugHeader}>
                      <View style={styles.drugIcon}>
                        <Ionicons name="medical-outline" size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.drugName}>{record.drugName}</Text>
                    </View>
                    <View style={styles.drugActions}>
                      <TouchableOpacity
                        style={[
                          styles.dispenseButton,
                          dispensing !== null && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                          void handleDispense(record.drugName, 'DISPENSED')
                        }
                        disabled={dispensing !== null}
                      >
                        {dispensing === record.drugName ? (
                          <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-outline" size={14} color={colors.white} />
                            <Text style={styles.dispenseButtonText}>Dispense</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.unavailableButton,
                          dispensing !== null && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                          void handleDispense(record.drugName, 'UNAVAILABLE')
                        }
                        disabled={dispensing !== null}
                      >
                        <Ionicons name="close-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.unavailableButtonText}>Unavailable</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
        <SafeAreaView style={styles.scannerSafeArea} edges={['top', 'bottom']}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.scannerCloseButton}
              onPress={() => setScannerVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan Prescription QR</Text>
            <View style={styles.scannerHeaderSpacer} />
          </View>

          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scannerLocked ? undefined : handleBarcodeScanned}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scannerHint}>
                Position the prescription QR code inside the frame
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.headerGradientStart },
  keyboardView: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 21, fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  lookupCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  lookupIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  lookupTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  lookupSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  scanButton: { width: '100%', minHeight: 50, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scanButtonText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  orRow: { width: '100%', flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  orDivider: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { marginHorizontal: 12, color: colors.textDisabled, fontSize: 11, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8, marginTop: 4, alignSelf: 'flex-start', width: '100%' },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.textPrimary, width: '100%', marginBottom: 16 },
  lookupButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' },
  lookupButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
  prescCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  prescHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  rxBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  rxText: { fontSize: 16, fontWeight: '800', color: colors.primary, fontStyle: 'italic' },
  prescInfo: { flex: 1 },
  prescId: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  prescDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  newScanBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  newScanText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10 },
  statusText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, marginTop: 8 },
  allDoneCard: { alignItems: 'center', paddingVertical: 40, backgroundColor: colors.successLight, borderRadius: 16, gap: 12 },
  allDoneText: { fontSize: 16, fontWeight: '600', color: colors.success },
  drugCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  drugHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  drugIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  drugName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  drugActions: { flexDirection: 'row', gap: 10 },
  dispenseButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dispenseButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  unavailableButton: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  unavailableButtonText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  scannerSafeArea: { flex: 1, backgroundColor: colors.black },
  scannerHeader: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.headerDark },
  scannerCloseButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  scannerTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  scannerHeaderSpacer: { width: 42 },
  cameraContainer: { flex: 1 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  scanFrame: { width: 260, height: 260, borderWidth: 3, borderColor: colors.white, borderRadius: 24, backgroundColor: 'transparent' },
  scannerHint: { marginTop: 26, maxWidth: 300, color: colors.white, fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '600' },
});
