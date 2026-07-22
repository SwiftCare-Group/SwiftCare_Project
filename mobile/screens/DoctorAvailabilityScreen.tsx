import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

const mockDoctors = [
  {
    id: 1,
    name: 'Dr. Mensah',
    specialty: 'General Practitioner',
    available: true,
    nextSlot: '10:30 AM',
    rating: '4.8',
    patients: 120,
  },
  {
    id: 2,
    name: 'Dr. Asante',
    specialty: 'Cardiologist',
    available: true,
    nextSlot: '11:00 AM',
    rating: '4.9',
    patients: 98,
  },
  {
    id: 3,
    name: 'Dr. Boateng',
    specialty: 'Pediatrician',
    available: false,
    nextSlot: '02:00 PM',
    rating: '4.7',
    patients: 145,
  },
  {
    id: 4,
    name: 'Dr. Owusu',
    specialty: 'Dermatologist',
    available: true,
    nextSlot: '12:15 PM',
    rating: '4.6',
    patients: 87,
  },
];

export default function DoctorAvailabilityScreen({ onBack }: { onBack: () => void }) {
  const [booked, setBooked] = useState<number | null>(null);

  const handleBook = (id: number) => {
    setBooked(id);
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.heading}>Available Doctors</Text>
      <Text style={styles.subheading}>Today · {new Date().toLocaleDateString()}</Text>

      {mockDoctors.map((doctor) => (
        <View key={doctor.id} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {doctor.name.split(' ')[1][0]}
              </Text>
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.specialty}>{doctor.specialty}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>⭐ {doctor.rating}</Text>
                <Text style={styles.meta}>👥 {doctor.patients} patients</Text>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              doctor.available ? styles.statusAvailable : styles.statusBusy
            ]}>
              <Text style={[
                styles.statusText,
                doctor.available ? styles.statusTextAvailable : styles.statusTextBusy
              ]}>
                {doctor.available ? 'Available' : 'Busy'}
              </Text>
            </View>
          </View>

          <View style={styles.cardBottom}>
            <Text style={styles.nextSlot}>
              Next slot: {doctor.nextSlot}
            </Text>
            {booked === doctor.id ? (
              <View style={styles.bookedBadge}>
                <Text style={styles.bookedText}>✓ Booked!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.bookBtn,
                  !doctor.available && styles.bookBtnDisabled
                ]}
                onPress={() => doctor.available && handleBook(doctor.id)}
              >
                <Text style={styles.bookBtnText}>
                  {doctor.available ? 'Book Now' : 'Unavailable'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  backBtn: { marginTop: 48, marginBottom: 8 },
  backText: { color: Colors.primary, fontSize: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  subheading: { fontSize: 12, color: Colors.textSecondary, marginBottom: 16 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  specialty: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  meta: { fontSize: 11, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusAvailable: { backgroundColor: Colors.successLight },
  statusBusy: { backgroundColor: Colors.dangerLight },
  statusText: { fontSize: 11 },
  statusTextAvailable: { color: Colors.success },
  statusTextBusy: { color: Colors.danger },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: Colors.border, paddingTop: 10 },
  nextSlot: { fontSize: 12, color: Colors.textSecondary },
  bookBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  bookBtnDisabled: { backgroundColor: Colors.primaryMuted },
  bookBtnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  bookedBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  bookedText: { color: Colors.success, fontSize: 13, fontWeight: '600' },
});