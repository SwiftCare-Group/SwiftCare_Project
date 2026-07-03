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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function DispenseScreen() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState('');
  const [prescription, setPrescription] = useState<any>(null);
  const [remaining, setRemaining] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState<string | null>(null);
  const [pharmacyName, setPharmacyName] = useState('');

  const handleScanQr = async () => {
    if (!qrCode.trim()) {
      Alert.alert('Error', 'Please enter the prescription ID or QR code data');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/prescriptions/${qrCode.trim()}`);
      setPrescription(response.data);

      const remainingRes = await api.get(`/prescriptions/${qrCode.trim()}/remaining`);
      setRemaining(remainingRes.data);
    } catch (error) {
      Alert.alert('Error', 'Prescription not found. Please check the ID and try again.');
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
        drugName,
        status,
        pharmacyName: pharmacyName.trim(),
      });

      const remainingRes = await api.get(`/prescriptions/${prescription.id}/remaining`);
      setRemaining(remainingRes.data);

      Alert.alert(
        'Success',
        status === 'DISPENSED'
          ? `${drugName} marked as dispensed`
          : `${drugName} marked as unavailable`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update dispensation status');
    } finally {
      setDispensing(null);
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

  const handleReset = () => {
    setPrescription(null);
    setRemaining([]);
    setQrCode('');
    setPharmacyName('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Dispense Medication</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {!prescription ? (
        <View style={styles.scanSection}>
          <Text style={styles.subtitle}>
            Enter the prescription ID from the patient's QR code to view and dispense their medication.
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
            style={[styles.scanButton, loading && styles.buttonDisabled]}
            onPress={handleScanQr}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.scanButtonText}>Look Up Prescription</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.prescriptionSection}>
          <View style={styles.prescriptionHeader}>
            <View>
              <Text style={styles.prescLabel}>Prescription</Text>
              <Text style={styles.prescId}>#{prescription.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>New Scan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Issued</Text>
              <Text style={styles.infoValue}>
                {new Date(prescription.issuedAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remaining</Text>
              <Text style={[
                styles.infoValue,
                { color: remaining.length === 0 ? Colors.success : Colors.warning }
              ]}>
                {remaining.length === 0 ? 'Fully dispensed' : `${remaining.length} drug(s) pending`}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Your Pharmacy Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. KNUST Pharmacy"
            placeholderTextColor={Colors.textDisabled}
            value={pharmacyName}
            onChangeText={setPharmacyName}
          />

          <Text style={styles.sectionTitle}>Drugs to Dispense</Text>

          {remaining.length === 0 ? (
            <View style={styles.allDoneCard}>
              <Text style={styles.allDoneIcon}>✅</Text>
              <Text style={styles.allDoneText}>All drugs have been dispensed</Text>
            </View>
          ) : (
            remaining.map((record: any) => (
              <View key={record.id} style={styles.drugCard}>
                <Text style={styles.drugName}>{record.drugName}</Text>
                <View style={styles.drugActions}>
                  <TouchableOpacity
                    style={[
                      styles.dispenseButton,
                      dispensing === record.drugName && styles.buttonDisabled
                    ]}
                    onPress={() => handleDispense(record.drugName, 'DISPENSED')}
                    disabled={dispensing === record.drugName}
                  >
                    {dispensing === record.drugName ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.dispenseButtonText}>Dispense</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.unavailableButton,
                      dispensing === record.drugName && styles.buttonDisabled
                    ]}
                    onPress={() => handleDispense(record.drugName, 'UNAVAILABLE')}
                    disabled={dispensing === record.drugName}
                  >
                    <Text style={styles.unavailableButtonText}>Unavailable</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary },
  logoutText: { color: Colors.danger, fontSize: 14, fontWeight: '600' },
  scanSection: {},
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  scanButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  scanButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  prescriptionSection: {},
  prescriptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  prescLabel: { fontSize: 12, color: Colors.textDisabled, textTransform: 'uppercase', letterSpacing: 0.5 },
  prescId: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  resetButton: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  resetButtonText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  infoCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12, marginTop: 8 },
  allDoneCard: { alignItems: 'center', paddingVertical: 40, backgroundColor: Colors.successLight, borderRadius: 14 },
  allDoneIcon: { fontSize: 40, marginBottom: 12 },
  allDoneText: { fontSize: 15, fontWeight: '600', color: Colors.success },
  drugCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  drugName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  drugActions: { flexDirection: 'row', gap: 10 },
  dispenseButton: { flex: 1, backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  dispenseButtonText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  unavailableButton: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  unavailableButtonText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
});