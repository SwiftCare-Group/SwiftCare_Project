import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

const mockHistory = [
  {
    id: 1,
    doctor: 'Dr. Mensah',
    date: '24 June 2026',
    time: '10:30 AM',
    status: 'COMPLETED',
    severity: 'MILD',
    symptoms: 'Headache, fever',
  },
  {
    id: 2,
    doctor: 'Dr. Asante',
    date: '18 June 2026',
    time: '02:15 PM',
    status: 'COMPLETED',
    severity: 'MODERATE',
    symptoms: 'Chest pain, shortness of breath',
  },
  {
    id: 3,
    doctor: 'Dr. Boateng',
    date: '10 June 2026',
    time: '09:00 AM',
    status: 'CANCELLED',
    severity: 'MILD',
    symptoms: 'Sore throat, cough',
  },
];

export default function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.heading}>Consultation History</Text>

      {mockHistory.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => setSelected(selected === item.id ? null : item.id)}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.doctorName}>{item.doctor}</Text>
              <Text style={styles.dateText}>{item.date} · {item.time}</Text>
            </View>
            <View style={[
              styles.badge,
              item.status === 'COMPLETED' ? styles.badgeGreen : styles.badgeRed
            ]}>
              <Text style={[
                styles.badgeText,
                item.status === 'COMPLETED' ? styles.badgeTextGreen : styles.badgeTextRed
              ]}>
                {item.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
              </Text>
            </View>
          </View>

          {/* Expanded details */}
          {selected === item.id && (
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Symptoms</Text>
                <Text style={styles.detailValue}>{item.symptoms}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Severity</Text>
                <View style={[
                  styles.severityBadge,
                  item.severity === 'MILD' ? styles.severityMild : styles.severityModerate
                ]}>
                  <Text style={[
                    styles.severityText,
                    item.severity === 'MILD' ? styles.severityTextMild : styles.severityTextModerate
                  ]}>
                    {item.severity}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <Text style={styles.expandHint}>
            {selected === item.id ? '▲ Hide details' : '▼ View details'}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  backBtn: { marginTop: 48, marginBottom: 8 },
  backText: { color: Colors.primary, fontSize: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  doctorName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  dateText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeGreen: { backgroundColor: Colors.successLight },
  badgeRed: { backgroundColor: Colors.dangerLight },
  badgeText: { fontSize: 11 },
  badgeTextGreen: { color: Colors.success },
  badgeTextRed: { color: Colors.danger },
  details: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: Colors.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailLabel: { fontSize: 12, color: Colors.textSecondary },
  detailValue: { fontSize: 12, color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  severityMild: { backgroundColor: Colors.severityMildBg },
  severityModerate: { backgroundColor: Colors.severityModerateBg },
  severityText: { fontSize: 11 },
  severityTextMild: { color: Colors.severityMild },
  severityTextModerate: { color: Colors.severityModerate },
  expandHint: { fontSize: 11, color: Colors.textDisabled, marginTop: 8, textAlign: 'right' },
});