import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrescriptionScreen() {
  //const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [remaining, setRemaining] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedQr, setExpandedQr] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const prescriptionsRes = await api.get('/prescriptions/my');
      const prescList = prescriptionsRes.data;

      const remainingMap: Record<string, any[]> = {};
      await Promise.all(
        prescList.map(async (presc: any) => {
          try {
            const remainRes = await api.get(`/prescriptions/${presc.id}/remaining`);
            remainingMap[presc.id] = remainRes.data;
          } catch {
            remainingMap[presc.id] = [];
          }
        })
      );

      setPrescriptions(prescList);
      setRemaining(remainingMap);
    } catch (error) {
      console.error('Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Prescriptions</Text>
        <Text style={styles.subtitle}>
          Present the QR code at any pharmacy to collect your medication.
        </Text>

        {Object.keys(prescriptions).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyText}>No prescriptions yet</Text>
            <Text style={styles.emptySubtext}>
              Prescriptions appear here after a completed consultation
            </Text>
          </View>
        ) : (
          (prescriptions as any[]).map((presc: any) => {
            const remainingDrugs = remaining[presc.id] || [];
            const allDispensed = remainingDrugs.length === 0;

            return (
              <View key={presc.id} style={styles.prescriptionCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.doctorName}>Prescription</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: allDispensed ? Colors.successLight : Colors.warningLight }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: allDispensed ? Colors.success : Colors.warning }
                    ]}>
                      {allDispensed ? 'Fully Dispensed' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dateText}>
                  Issued: {new Date(presc.issuedAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </Text>

                <View style={styles.drugsSection}>
                  <Text style={styles.drugsTitle}>Prescribed Drugs</Text>
                  {presc.drugs.map((drug: string, index: number) => {
                    const isRemaining = remainingDrugs.some(
                      (r: any) => r.drugName === drug
                    );
                    return (
                      <View key={index} style={styles.drugRow}>
                        <Text style={styles.drugName}>{drug}</Text>
                        <View style={[
                          styles.drugBadge,
                          { backgroundColor: isRemaining ? Colors.warningLight : Colors.successLight }
                        ]}>
                          <Text style={[
                            styles.drugBadgeText,
                            { color: isRemaining ? Colors.warning : Colors.success }
                          ]}>
                            {isRemaining ? 'Pending' : 'Dispensed'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => setExpandedQr(expandedQr === presc.id ? null : presc.id)}
                >
                  <Text style={styles.qrButtonText}>
                    {expandedQr === presc.id ? 'Hide QR Code' : 'Show QR Code'}
                  </Text>
                </TouchableOpacity>

                {expandedQr === presc.id && presc.qrCodeData && (
                  <View style={styles.qrContainer}>
                    <Image
                      source={{ uri: `data:image/png;base64,${presc.qrCodeData}` }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.qrHint}>
                      Present this QR code at any pharmacy
                    </Text>
                    {remainingDrugs.length > 0 && (
                      <Text style={styles.remainingHint}>
                        {remainingDrugs.length} drug(s) still pending collection
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled, textAlign: 'center', paddingHorizontal: 20 },
  prescriptionCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  doctorName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  drugsSection: { marginBottom: 16 },
  drugsTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  drugRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  drugName: { fontSize: 14, color: Colors.textPrimary },
  drugBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  drugBadgeText: { fontSize: 11, fontWeight: '600' },
  qrButton: { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  qrButtonText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  qrContainer: { alignItems: 'center', paddingTop: 16 },
  qrImage: { width: 220, height: 220, marginBottom: 12 },
  qrHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  remainingHint: { fontSize: 12, color: Colors.warning, marginTop: 6, textAlign: 'center' },
});