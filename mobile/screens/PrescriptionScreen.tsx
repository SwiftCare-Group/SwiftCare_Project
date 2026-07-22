import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Image
} from 'react-native';
import { Colors } from '../constants/colors';
import { getPrescription, getDrugsOnPrescription } from '../services/api';

export default function PrescriptionScreen({ route }: any) {
  const { prescriptionId } = route.params;

  const [prescription, setPrescription] = useState<any>(null);
  const [drugs, setDrugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const presData = await getPrescription(prescriptionId);
      const drugData = await getDrugsOnPrescription(prescriptionId);
      setPrescription(presData);
      setDrugs(drugData);
    } catch (error) {
      console.error('Failed to load prescription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your prescription...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Doctor + Date info */}
      <View style={styles.infoBox}>
        <Text style={styles.label}>Prescribed by</Text>
        <Text style={styles.infoText}>
          Dr. {prescription?.doctorName} · {prescription?.date}
        </Text>
      </View>

      {/* QR Code section */}
      <View style={styles.qrBox}>
        <Text style={styles.label}>Show this at any pharmacy</Text>
        {prescription?.qrCodeUrl ? (
          <Image
            source={{ uri: prescription.qrCodeUrl }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>QR Code</Text>
          </View>
        )}
        <Text style={styles.rxCode}>RX-{prescriptionId}</Text>
      </View>

      {/* Drug list */}
      <Text style={styles.sectionTitle}>Drugs on this prescription</Text>
      {drugs.map((drug) => (
        <View key={drug.id} style={styles.drugCard}>
          <View>
            <Text style={styles.drugName}>{drug.drugName}</Text>
            <Text style={styles.drugDosage}>{drug.dosage}</Text>
          </View>
          <View style={[
            styles.badge,
            drug.status === 'DISPENSED' ? styles.badgeGreen : styles.badgeRed
          ]}>
            <Text style={[
              styles.badgeText,
              drug.status === 'DISPENSED' ? styles.badgeTextGreen : styles.badgeTextRed
            ]}>
              {drug.status === 'DISPENSED' ? 'Collected' : 'Unavailable'}
            </Text>
          </View>
        </View>
      ))}

      {/* Warning tip if any drug is unavailable */}
      {drugs.some(d => d.status === 'UNAVAILABLE') && (
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            Some drugs weren't available. Show your QR code at another pharmacy to collect the rest.
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary
  },
  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary
  },
  qrBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border
  },
  qrImage: {
    width: 160,
    height: 160,
    marginVertical: 10
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    marginVertical: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border
  },
  qrPlaceholderText: {
    color: Colors.textDisabled,
    fontSize: 13
  },
  rxCode: {
    fontSize: 11,
    color: Colors.textDisabled,
    letterSpacing: 1
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8
  },
  drugCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border
  },
  drugName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary
  },
  drugDosage: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  badgeGreen: { backgroundColor: Colors.successLight },
  badgeRed: { backgroundColor: Colors.dangerLight },
  badgeText: { fontSize: 11 },
  badgeTextGreen: { color: Colors.success },
  badgeTextRed: { color: Colors.danger },
  tipBox: {
    backgroundColor: Colors.infoLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 24
  },
  tipText: {
    fontSize: 12,
    color: Colors.info,
    lineHeight: 18
  }
});