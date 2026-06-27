import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from './constants/colors';
import PharmacistScreen from './screens/PharmacistScreen';
import HistoryScreen from './screens/HistoryScreen';
import DoctorAvailabilityScreen from './screens/DoctorAvailabilityScreen';
import VideoCallScreen from './screens/VideoCallScreen';

export default function App() {
  const [screen, setScreen] = useState('home');

  if (screen === 'pharmacist') {
    return <PharmacistScreen onBack={() => setScreen('home')} />;
  }

  if (screen === 'history') {
    return <HistoryScreen onBack={() => setScreen('home')} />;
  }

  if (screen === 'doctors') {
    return <DoctorAvailabilityScreen onBack={() => setScreen('home')} />;
  }

  if (screen === 'videocall') {
    return <VideoCallScreen onBack={() => setScreen('home')} />;
  }

  if (screen === 'prescription') {
    return (
      <ScrollView style={styles.scroll}>
        <TouchableOpacity onPress={() => setScreen('home')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>My Prescription</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Prescribed by</Text>
          <Text style={styles.value}>Dr. Mensah · 24 June 2026</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Show this at any pharmacy</Text>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrText}>QR Code</Text>
          </View>
          <Text style={styles.rxCode}>RX-1</Text>
        </View>
        <Text style={styles.sectionTitle}>Drugs on this prescription</Text>
        <View style={styles.drugCard}>
          <View>
            <Text style={styles.drugName}>Paracetamol 500mg</Text>
            <Text style={styles.drugDosage}>3 times daily · 5 days</Text>
          </View>
          <View style={styles.badgeGreen}>
            <Text style={styles.badgeTextGreen}>Collected</Text>
          </View>
        </View>
        <View style={styles.drugCard}>
          <View>
            <Text style={styles.drugName}>Amoxicillin 250mg</Text>
            <Text style={styles.drugDosage}>2 times daily · 7 days</Text>
          </View>
          <View style={styles.badgeRed}>
            <Text style={styles.badgeTextRed}>Unavailable</Text>
          </View>
        </View>
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            Amoxicillin not collected yet. Show QR code at another pharmacy.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SwiftCare</Text>
      <TouchableOpacity style={styles.button} onPress={() => setScreen('prescription')}>
        <Text style={styles.buttonText}>View Prescription</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonDark]} onPress={() => setScreen('pharmacist')}>
        <Text style={styles.buttonText}>Pharmacist Portal</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonDark]} onPress={() => setScreen('history')}>
        <Text style={styles.buttonText}>Consultation History</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonDark]} onPress={() => setScreen('doctors')}>
        <Text style={styles.buttonText}>Available Doctors</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonDark]} onPress={() => setScreen('videocall')}>
        <Text style={styles.buttonText}>Join Video Call</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.primary, marginBottom: 32 },
  button: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, width: 260, alignItems: 'center', marginBottom: 12 },
  buttonDark: { backgroundColor: Colors.primaryDark },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  backBtn: { marginTop: 48, marginBottom: 8 },
  backText: { color: Colors.primary, fontSize: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center' },
  label: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  value: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  qrPlaceholder: { width: 160, height: 160, backgroundColor: Colors.surfaceSecondary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginVertical: 10, borderWidth: 0.5, borderColor: Colors.border },
  qrText: { color: Colors.textDisabled, fontSize: 13 },
  rxCode: { fontSize: 11, color: Colors.textDisabled, letterSpacing: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 8 },
  drugCard: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 0.5, borderColor: Colors.border },
  drugName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  drugDosage: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badgeGreen: { backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeRed: { backgroundColor: Colors.dangerLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTextGreen: { fontSize: 11, color: Colors.success },
  badgeTextRed: { fontSize: 11, color: Colors.danger },
  tipBox: { backgroundColor: Colors.infoLight, borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 24 },
  tipText: { fontSize: 12, color: Colors.info, lineHeight: 18 },
});