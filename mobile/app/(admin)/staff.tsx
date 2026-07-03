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

  useEffect(() => {
    fetchData();
  }, []);

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
        name, email, password, licenseNo,
        departmentId: selectedDept,
      });
      Alert.alert('Success', 'Doctor account created successfully');
      setShowForm(false);
      setName(''); setEmail(''); setPassword(''); setLicenseNo(''); setSelectedDept(null);
      fetchData();
    } catch (error) {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Staff Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ Add Doctor'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Doctor Account</Text>
          {[
            { label: 'Full Name', value: name, setter: setName, placeholder: 'Dr. Kwame Mensah' },
            { label: 'Email', value: email, setter: setEmail, placeholder: 'doctor@hospital.com' },
            { label: 'Password', value: password, setter: setPassword, placeholder: 'Secure password', secure: true },
            { label: 'License Number', value: licenseNo, setter: setLicenseNo, placeholder: 'GH-MED-001' },
          ].map(field => (
            <View key={field.label}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.textDisabled}
                value={field.value}
                onChangeText={field.setter}
                secureTextEntry={field.secure}
                autoCapitalize="none"
              />
            </View>
          ))}

          <Text style={styles.label}>Department</Text>
          {departments.map(dept => (
            <TouchableOpacity
              key={dept.id}
              style={[styles.deptOption, selectedDept === dept.id && styles.deptOptionSelected]}
              onPress={() => setSelectedDept(dept.id)}
            >
              <Text style={[styles.deptOptionText, selectedDept === dept.id && styles.deptOptionTextSelected]}>
                {dept.name}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.createButton, submitting && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.createButtonText}>Create Doctor Account</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Doctors ({doctors.length})</Text>
      {doctors.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No doctors yet</Text>
          <Text style={styles.emptySubtext}>Add your first doctor above</Text>
        </View>
      ) : (
        doctors.map(doctor => (
          <View key={doctor.id} style={styles.doctorCard}>
            <View style={styles.doctorHeader}>
              <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
              <View style={[styles.availBadge, { backgroundColor: doctor.isAvailableOnline ? Colors.successLight : Colors.dangerLight }]}>
                <Text style={[styles.availText, { color: doctor.isAvailableOnline ? Colors.success : Colors.danger }]}>
                  {doctor.isAvailableOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
            <Text style={styles.doctorEmail}>{doctor.email}</Text>
            <Text style={styles.doctorDept}>{doctor.departmentName}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary },
  addButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  formCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  deptOption: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, marginBottom: 6 },
  deptOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  deptOptionText: { fontSize: 14, color: Colors.textPrimary },
  deptOptionTextSelected: { color: Colors.primary, fontWeight: '600' },
  createButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  createButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  emptySubtext: { fontSize: 13, color: Colors.textDisabled, marginTop: 4 },
  doctorCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  doctorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  doctorName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  availBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  availText: { fontSize: 12, fontWeight: '600' },
  doctorEmail: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  doctorDept: { fontSize: 12, color: Colors.textDisabled },
});