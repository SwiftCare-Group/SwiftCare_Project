import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput
} from 'react-native';
import { Colors } from '../constants/colors';

const mockDrugs = [
  { id: 1, drugName: 'Paracetamol 500mg', dosage: '3 times daily · 5 days', status: 'PENDING' },
  { id: 2, drugName: 'Amoxicillin 250mg', dosage: '2 times daily · 7 days', status: 'PENDING' },
];

export default function PharmacistScreen({ onBack }: { onBack: () => void }) {
  const [rxId, setRxId] = useState('');
  const [searched, setSearched] = useState(false);
  const [drugs, setDrugs] = useState(mockDrugs);

  const handleSearch = () => {
    if (rxId.trim()) setSearched(true);
  };

  const markDrug = (id: number, status: 'DISPENSED' | 'UNAVAILABLE') => {
    setDrugs(drugs.map(d => d.id === id ? { ...d, status } : d));
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.heading}>Pharmacist Portal</Text>

      {/* Search box */}
      <View style={styles.searchBox}>
        <Text style={styles.label}>Enter Prescription ID</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 1"
          value={rxId}
          onChangeText={setRxId}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Look Up Prescription</Text>
        </TouchableOpacity>
      </View>

      {/* Drug list */}
      {searched && (
        <>
          <Text style={styles.sectionTitle}>
            Drugs on Prescription RX-{rxId}
          </Text>
          {drugs.map((drug) => (
            <View key={drug.id} style={styles.drugCard}>
              <View style={styles.drugInfo}>
                <Text style={styles.drugName}>{drug.drugName}</Text>
                <Text style={styles.drugDosage}>{drug.dosage}</Text>
                {drug.status !== 'PENDING' && (
                  <View style={[
                    styles.badge,
                    drug.status === 'DISPENSED' ? styles.badgeGreen : styles.badgeRed
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      drug.status === 'DISPENSED' ? styles.badgeTextGreen : styles.badgeTextRed
                    ]}>
                      {drug.status === 'DISPENSED' ? 'Dispensed' : 'Unavailable'}
                    </Text>
                  </View>
                )}
              </View>
              {drug.status === 'PENDING' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.dispenseBtn}
                    onPress={() => markDrug(drug.id, 'DISPENSED')}
                  >
                    <Text style={styles.dispenseBtnText}>✓ Dispense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.unavailableBtn}
                    onPress={() => markDrug(drug.id, 'UNAVAILABLE')}
                  >
                    <Text style={styles.unavailableBtnText}>✗ Unavailable</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {drugs.every(d => d.status !== 'PENDING') && (
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                All drugs have been processed. Prescription complete!
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  backBtn: { marginTop: 48, marginBottom: 8 },
  backText: { color: Colors.primary, fontSize: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  searchBox: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: Colors.border },
  label: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: Colors.textPrimary, marginBottom: 12 },
  searchBtn: { backgroundColor: Colors.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
  searchBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 8 },
  drugCard: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: Colors.border },
  drugInfo: { marginBottom: 10 },
  drugName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  drugDosage: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  badgeGreen: { backgroundColor: Colors.successLight },
  badgeRed: { backgroundColor: Colors.dangerLight },
  badgeText: { fontSize: 11 },
  badgeTextGreen: { color: Colors.success },
  badgeTextRed: { color: Colors.danger },
  actions: { flexDirection: 'row', gap: 8 },
  dispenseBtn: { flex: 1, backgroundColor: Colors.primary, padding: 10, borderRadius: 8, alignItems: 'center' },
  dispenseBtnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  unavailableBtn: { flex: 1, backgroundColor: Colors.dangerLight, padding: 10, borderRadius: 8, alignItems: 'center' },
  unavailableBtnText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
  tipBox: { backgroundColor: Colors.successLight, borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 24 },
  tipText: { fontSize: 12, color: Colors.success, lineHeight: 18 },
});