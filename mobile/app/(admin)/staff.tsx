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
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function StaffScreen() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [doctorsRes, deptsRes] = await Promise.all([
        api.get('/consultations/doctors'),
        api.get('/departments'),
      ]);
      setDoctors(doctorsRes.data);
      setDepartments(deptsRes.data);
    } catch (error) {
      console.error('Failed to fetch staff data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !email || !password || !licenseNo || !selectedDept) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/doctors', {
        name, email, password, licenseNo, departmentId: selectedDept,
      });
      Alert.alert('Success', 'Doctor account created');
      setShowForm(false);
      setName(''); setEmail(''); setPassword(''); setLicenseNo(''); setSelectedDept(null);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to create doctor account');
    } finally {
      setSubmitting(false);
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Staff Management</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(!showForm)}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{doctors.length} doctors registered</Text>
      </LinearGradient>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Doctor Account</Text>
            {[
              { label: 'Full Name', value: name, setter: setName, placeholder: 'Dr. Kwame Mensah' },
              { label: 'Email', value: email, setter: setEmail, placeholder: 'doctor@hospital.com', caps: 'none' as any },
              { label: 'Password', value: password, setter: setPassword, placeholder: 'Secure password', secure: true },
              { label: 'License Number', value: licenseNo, setter: setLicenseNo, placeholder: 'GH-MED-001' },
            ].map(field => (
              <View key={field.label}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textDisabled}
                  value={field.value}
                  onChangeText={field.setter}
                  secureTextEntry={field.secure}
                  autoCapitalize={field.caps || 'words'}
                />
              </View>
            ))}

            <Text style={styles.fieldLabel}>Department</Text>
            {departments.map(dept => (
              <TouchableOpacity
                key={dept.id}
                style={[styles.deptOption, selectedDept === dept.id && styles.deptOptionSelected]}
                onPress={() => setSelectedDept(dept.id)}
              >
                <Ionicons
                  name={selectedDept === dept.id ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={selectedDept === dept.id ? Colors.primary : Colors.textDisabled}
                />
                <Text style={[
                  styles.deptOptionText,
                  selectedDept === dept.id && styles.deptOptionTextSelected
                ]}>
                  {dept.name}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.createButton, submitting && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.createButtonText}>Create Doctor Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Doctors ({doctors.length})</Text>

        {doctors.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="person-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyText}>No doctors yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first doctor</Text>
          </View>
        ) : (
          doctors.map(doctor => (
            <View key={doctor.id} style={styles.doctorCard}>
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorAvatarText}>
                  {doctor.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
                <Text style={styles.doctorDept}>{doctor.departmentName}</Text>
                <Text style={styles.doctorEmail}>{doctor.email}</Text>
              </View>
              <View style={[
                styles.availBadge,
                { backgroundColor: doctor.isAvailableOnline ? Colors.successLight : Colors.dangerLight }
              ]}>
                <View style={[
                  styles.availDot,
                  { backgroundColor: doctor.isAvailableOnline ? Colors.success : Colors.danger }
                ]} />
                <Text style={[
                  styles.availText,
                  { color: doctor.isAvailableOnline ? Colors.success : Colors.danger }
                ]}>
                  {doctor.isAvailableOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  formCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  deptOption: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, marginBottom: 6 },
  deptOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  deptOptionText: { fontSize: 14, color: Colors.textPrimary },
  deptOptionTextSelected: { color: Colors.primary, fontWeight: '600' },
  createButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  createButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled, marginTop: 4 },
  doctorCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.border },
  doctorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  doctorAvatarText: { fontSize: 20, fontWeight: '700', color: Colors.white },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  doctorDept: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  doctorEmail: { fontSize: 11, color: Colors.textDisabled, marginTop: 1 },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontWeight: '600' },
});