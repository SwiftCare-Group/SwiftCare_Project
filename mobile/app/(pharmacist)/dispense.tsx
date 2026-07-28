import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';
import api, { logoutSession } from '../../services/api';

type DispensationStatus = 'PENDING' | 'DISPENSED' | 'UNAVAILABLE';

type DispensationRecord = {
  id: string;
  prescriptionId: string;
  drugName: string;
  status: DispensationStatus;
  pharmacyName?: string | null;
  pharmacistName?: string | null;
  quantityDispensed?: string | null;
  notes?: string | null;
  dispensedAt?: string | null;
};

type Prescription = {
  id: string;
  patientId: string;
  doctorId: string;
  consultationId: string;
  drugs: string[];
  issuedAt: string;
  dispensationRecords?: DispensationRecord[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

export default function PharmacistDispenseScreen() {
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [lookupValue, setLookupValue] = useState('');
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [records, setRecords] = useState<DispensationRecord[]>([]);
  const [pharmacyName, setPharmacyName] = useState('SwiftCare Pharmacy');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const pendingRecords = useMemo(
    () => records.filter(record => record.status === 'PENDING'),
    [records],
  );

  const loadRecords = useCallback(async (prescriptionId: string) => {
    const response = await api.get<DispensationRecord[]>(
      `/prescriptions/${prescriptionId}/dispensations`,
    );
    setRecords(Array.isArray(response.data) ? response.data : []);
  }, []);

  const applyPrescription = useCallback(
    async (data: Prescription) => {
      if (!data?.id) {
        throw new Error('The server returned an invalid prescription.');
      }
      setPrescription(data);
      if (Array.isArray(data.dispensationRecords)) {
        setRecords(data.dispensationRecords);
      } else {
        await loadRecords(data.id);
      }
      setLookupValue(data.id);
    },
    [loadRecords],
  );

  const lookupPrescription = useCallback(
    async (value: string) => {
      const cleaned = value.trim();
      if (!cleaned) {
        Alert.alert('Prescription required', 'Scan the QR code or enter the prescription ID.');
        return;
      }

      setLoading(true);
      try {
        const response = UUID_PATTERN.test(cleaned)
          ? await api.get<Prescription>(`/prescriptions/${cleaned}`)
          : await api.post<Prescription>('/prescriptions/lookup', { code: cleaned });
        await applyPrescription(response.data);
      } catch (error) {
        setPrescription(null);
        setRecords([]);
        Alert.alert(
          'Prescription not found',
          getErrorMessage(error, 'The prescription ID or QR code is invalid.'),
        );
      } finally {
        setLoading(false);
      }
    },
    [applyPrescription],
  );

  const openScanner = async () => {
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();

    if (!permission?.granted) {
      Alert.alert(
        'Camera permission required',
        'Allow SwiftCare to use the camera so the pharmacist can scan prescription QR codes.',
      );
      return;
    }

    setHasScanned(false);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (hasScanned) return;
    setHasScanned(true);
    setScannerVisible(false);
    setLookupValue(result.data);
    await lookupPrescription(result.data);
  };

  const updateMedication = async (
    record: DispensationRecord,
    status: Exclude<DispensationStatus, 'PENDING'>,
  ) => {
    if (!prescription) return;
    if (!pharmacyName.trim()) {
      Alert.alert('Pharmacy required', 'Enter the pharmacy name before updating medication.');
      return;
    }

    setDispensing(record.id);
    try {
      const response = await api.patch<DispensationRecord>(
        `/prescriptions/${prescription.id}/dispense`,
        {
          drugName: record.drugName,
          status,
          pharmacyName: pharmacyName.trim(),
          quantityDispensed: quantity.trim() || null,
          notes: notes.trim() || null,
        },
      );

      setRecords(current =>
        current.map(item => (item.id === response.data.id ? response.data : item)),
      );
      Alert.alert(
        'Medication updated',
        status === 'DISPENSED'
          ? `${record.drugName} was recorded as dispensed.`
          : `${record.drugName} was recorded as unavailable.`,
      );
    } catch (error) {
      Alert.alert(
        'Unable to update medication',
        getErrorMessage(error, 'The medication status could not be saved.'),
      );
    } finally {
      setDispensing(null);
    }
  };

  const clearPrescription = () => {
    setPrescription(null);
    setRecords([]);
    setLookupValue('');
    setQuantity('');
    setNotes('');
  };

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to leave the pharmacy portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            await logoutSession();
            router.replace('/(auth)/staff-login');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Pharmacy Dispensing</Text>
            <Text style={styles.headerSubtitle}>
              Scan a verified SwiftCare QR code or use the prescription ID.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Log out of pharmacy portal"
          >
            <Ionicons name="log-out-outline" size={21} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!prescription ? (
          <View style={styles.lookupCard}>
            <View style={styles.lookupIcon}>
              <Ionicons name="qr-code-outline" size={38} color={Colors.primary} />
            </View>
            <Text style={styles.lookupTitle}>Find Prescription</Text>
            <Text style={styles.lookupSubtitle}>
              Scanning verifies the secure QR payload. Manual UUID entry remains available as a fallback.
            </Text>

            <TouchableOpacity style={styles.scanButton} onPress={() => void openScanner()}>
              <Ionicons name="camera-outline" size={20} color={Colors.white} />
              <Text style={styles.scanButtonText}>Scan Prescription QR</Text>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Prescription UUID"
              placeholderTextColor={Colors.textDisabled}
              value={lookupValue}
              onChangeText={setLookupValue}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.lookupButton, loading && styles.buttonDisabled]}
              onPress={() => void lookupPrescription(lookupValue)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="search-outline" size={18} color={Colors.white} />
                  <Text style={styles.lookupButtonText}>Look Up Prescription</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.prescriptionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.rxBadge}>
                  <Text style={styles.rxText}>Rx</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.prescId}>#{prescription.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.prescDate}>
                    Issued {new Date(prescription.issuedAt).toLocaleDateString('en-GB')}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={clearPrescription}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Dispensing status</Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: pendingRecords.length === 0 ? Colors.success : Colors.warning },
                  ]}
                >
                  {pendingRecords.length === 0
                    ? 'Complete'
                    : `${pendingRecords.length} medication(s) pending`}
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Dispensing details</Text>
              <Text style={styles.label}>Pharmacy name *</Text>
              <TextInput
                style={styles.input}
                value={pharmacyName}
                onChangeText={setPharmacyName}
                placeholder="SwiftCare Pharmacy"
                placeholderTextColor={Colors.textDisabled}
              />
              <Text style={styles.label}>Quantity supplied</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="For example: 20 tablets"
                placeholderTextColor={Colors.textDisabled}
              />
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional dispensing note"
                placeholderTextColor={Colors.textDisabled}
                multiline
                maxLength={1000}
              />
            </View>

            <Text style={styles.sectionTitle}>Medications</Text>
            {records.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="medkit-outline" size={34} color={Colors.textDisabled} />
                <Text style={styles.emptyText}>No medication records were returned.</Text>
              </View>
            ) : (
              records.map(record => {
                const busy = dispensing === record.id;
                const final = record.status !== 'PENDING';
                return (
                  <View key={record.id} style={styles.drugCard}>
                    <View style={styles.drugTopRow}>
                      <View style={styles.drugIcon}>
                        <Ionicons name="medical-outline" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.drugInfo}>
                        <Text style={styles.drugName}>{record.drugName}</Text>
                        <Text
                          style={[
                            styles.drugStatus,
                            {
                              color:
                                record.status === 'DISPENSED'
                                  ? Colors.success
                                  : record.status === 'UNAVAILABLE'
                                    ? Colors.danger
                                    : Colors.warning,
                            },
                          ]}
                        >
                          {record.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    {final ? (
                      <View style={styles.auditBox}>
                        <Text style={styles.auditText}>
                          {record.pharmacistName || 'Pharmacist'} · {record.pharmacyName || 'Pharmacy'}
                        </Text>
                        {record.dispensedAt ? (
                          <Text style={styles.auditText}>
                            {new Date(record.dispensedAt).toLocaleString('en-GB')}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.dispenseButton, busy && styles.buttonDisabled]}
                          onPress={() => void updateMedication(record, 'DISPENSED')}
                          disabled={busy}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                              <Text style={styles.dispenseButtonText}>Dispense</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.unavailableButton, busy && styles.buttonDisabled]}
                          onPress={() => void updateMedication(record, 'UNAVAILABLE')}
                          disabled={busy}
                        >
                          <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                          <Text style={styles.unavailableButtonText}>Unavailable</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
        <SafeAreaView style={styles.scannerScreen} edges={['top', 'bottom']}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan Prescription</Text>
            <TouchableOpacity onPress={() => setScannerVisible(false)} style={styles.scannerClose}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            />
            <View style={styles.scanFrame} />
            <Text style={styles.scanInstruction}>Place the full QR code inside the frame.</Text>
          </View>
          {hasScanned ? (
            <TouchableOpacity style={styles.scanAgainButton} onPress={() => setHasScanned(false)}>
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  headerText: { flex: 1 },
  logoutButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.78)', marginTop: 4 },
  lookupCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  lookupIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  lookupTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  lookupSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  scanButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' },
  scanButtonText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { color: Colors.textDisabled, fontSize: 11, fontWeight: '700' },
  input: { width: '100%', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.textPrimary },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  lookupButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 12 },
  lookupButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
  prescriptionCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rxBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rxText: { color: Colors.primary, fontSize: 19, fontWeight: '800', fontStyle: 'italic' },
  cardInfo: { flex: 1 },
  prescId: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  prescDate: { color: Colors.textSecondary, fontSize: 12, marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.border },
  statusLabel: { color: Colors.textSecondary, fontSize: 12 },
  statusValue: { fontSize: 12, fontWeight: '700' },
  formCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 20, gap: 8 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  emptyState: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 28, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 13, marginTop: 10 },
  drugCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  drugTopRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  drugIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  drugInfo: { flex: 1 },
  drugName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  drugStatus: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  dispenseButton: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dispenseButtonText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  unavailableButton: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.danger, borderRadius: 10, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  unavailableButtonText: { color: Colors.danger, fontWeight: '700', fontSize: 13 },
  auditBox: { marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: Colors.background },
  auditText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 17 },
  scannerScreen: { flex: 1, backgroundColor: '#000' },
  scannerHeader: { height: 62, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#071B1C' },
  scannerTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  scannerClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  cameraWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 260, height: 260, borderWidth: 3, borderColor: Colors.white, borderRadius: 20, backgroundColor: 'transparent' },
  scanInstruction: { position: 'absolute', bottom: 50, color: Colors.white, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  scanAgainButton: { margin: 18, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  scanAgainText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
