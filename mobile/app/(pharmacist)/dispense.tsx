import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { showToast } from '../../utils/toast';


export default function DispenseScreen() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState('');
  const [prescription, setPrescription] = useState<any>(null);
  const [remaining, setRemaining] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState<string | null>(null);
  const [pharmacyName, setPharmacyName] = useState('');

  const handleLookup = async () => {
    if (!qrCode.trim()) {
      showToast.error('Please enter the prescription ID');
      return;
    }
    setLoading(true);
    try {
      const cleanId = qrCode.trim().replace(/\s/g, '');
      const response = await api.get(`/prescriptions/${cleanId}`);
      setPrescription(response.data);
      const remainingRes = await api.get(`/prescriptions/${cleanId}/remaining`);
      setRemaining(remainingRes.data);
    } catch {
      showToast.error('Prescription not found. Please check the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (drugName: string, status: 'DISPENSED' | 'UNAVAILABLE') => {
    if (!pharmacyName.trim()) {
      Alert.alert('Error', 'Please enter your pharmacy name first');
      return;
    }
    setDispensing(drugName);
    try {
      await api.put(`/prescriptions/${prescription.id}/dispense`, {
        drugName, status, pharmacyName: pharmacyName.trim(),
      });
      const remainingRes = await api.get(`/prescriptions/${prescription.id}/remaining`);
      setRemaining(remainingRes.data);
      showToast.success(status === 'DISPENSED'
        ? `${drugName} dispensed successfully`
        : `${drugName} marked as unavailable`
      );
    } catch {
      showToast.error('Failed to update dispensation status');
    } finally {
      showToast.error('Prescription not found. Please check the ID and try again.');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('accessToken');
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Dispense Medication</Text>
            <Text style={styles.headerSubtitle}>Enter prescription ID to dispense</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {!prescription ? (
          <View style={styles.lookupCard}>
            <View style={styles.lookupIcon}>
              <Ionicons name="qr-code-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.lookupTitle}>Scan or Enter Prescription ID</Text>
            <Text style={styles.lookupSubtitle}>
              Enter the prescription ID from the patient's QR code
            </Text>

            <Text style={styles.label}>Prescription ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter prescription ID"
              placeholderTextColor={Colors.textDisabled}
              value={qrCode}
              onChangeText={setQrCode}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.lookupButton, loading && styles.buttonDisabled]}
              onPress={handleLookup}
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
            {/* Prescription Header */}
            <View style={styles.prescCard}>
              <View style={styles.prescHeader}>
                <View style={styles.rxBadge}>
                  <Text style={styles.rxText}>Rx</Text>
                </View>
                <View style={styles.prescInfo}>
                  <Text style={styles.prescId}>#{prescription.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.prescDate}>
                    {new Date(prescription.issuedAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.newScanBtn}
                  onPress={() => { setPrescription(null); setRemaining([]); setQrCode(''); }}
                >
                  <Text style={styles.newScanText}>New Scan</Text>
                </TouchableOpacity>
              </View>

              <View style={[
                styles.statusRow,
                { backgroundColor: remaining.length === 0 ? Colors.successLight : Colors.warningLight }
              ]}>
                <Ionicons
                  name={remaining.length === 0 ? 'checkmark-circle-outline' : 'time-outline'}
                  size={16}
                  color={remaining.length === 0 ? Colors.success : Colors.warning}
                />
                <Text style={[
                  styles.statusText,
                  { color: remaining.length === 0 ? Colors.success : Colors.warning }
                ]}>
                  {remaining.length === 0 ? 'Fully dispensed' : `${remaining.length} drug(s) pending`}
                </Text>
              </View>
            </View>

            {/* Pharmacy Name */}
            <Text style={styles.label}>Your Pharmacy Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. KNUST Pharmacy"
              placeholderTextColor={Colors.textDisabled}
              value={pharmacyName}
              onChangeText={setPharmacyName}
            />

            {/* Drugs */}
            <Text style={styles.sectionTitle}>Drugs to Dispense</Text>

            {remaining.length === 0 ? (
              <View style={styles.allDoneCard}>
                <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
                <Text style={styles.allDoneText}>All drugs dispensed</Text>
              </View>
            ) : (
              remaining.map((record: any) => (
                <View key={record.id} style={styles.drugCard}>
                  <View style={styles.drugHeader}>
                    <View style={styles.drugIcon}>
                      <Ionicons name="medical-outline" size={18} color={Colors.primary} />
                    </View>
                    <Text style={styles.drugName}>{record.drugName}</Text>
                  </View>
                  <View style={styles.drugActions}>
                    <TouchableOpacity
                      style={[styles.dispenseButton, dispensing === record.drugName && styles.buttonDisabled]}
                      onPress={() => handleDispense(record.drugName, 'DISPENSED')}
                      disabled={dispensing === record.drugName}
                    >
                      {dispensing === record.drugName ? (
                        <ActivityIndicator color={Colors.white} size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-outline" size={14} color={Colors.white} />
                          <Text style={styles.dispenseButtonText}>Dispense</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unavailableButton, dispensing === record.drugName && styles.buttonDisabled]}
                      onPress={() => handleDispense(record.drugName, 'UNAVAILABLE')}
                      disabled={dispensing === record.drugName}
                    >
                      <Ionicons name="close-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.unavailableButtonText}>Unavailable</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  lookupCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  lookupIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  lookupTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  lookupSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, marginTop: 4, alignSelf: 'flex-start', width: '100%' },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary, width: '100%', marginBottom: 16 },
  lookupButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' },
  lookupButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  prescCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  prescHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  rxBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  rxText: { fontSize: 16, fontWeight: '800', color: Colors.primary, fontStyle: 'italic' },
  prescInfo: { flex: 1 },
  prescId: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  prescDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  newScanBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  newScanText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10 },
  statusText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12, marginTop: 8 },
  allDoneCard: { alignItems: 'center', paddingVertical: 40, backgroundColor: Colors.successLight, borderRadius: 16, gap: 12 },
  allDoneText: { fontSize: 16, fontWeight: '600', color: Colors.success },
  drugCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  drugHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  drugIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  drugName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  drugActions: { flexDirection: 'row', gap: 10 },
  dispenseButton: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dispenseButtonText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  unavailableButton: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  unavailableButtonText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
});