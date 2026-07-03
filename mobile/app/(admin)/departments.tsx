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

export default function DepartmentsScreen() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [queueCapacity, setQueueCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !operatingHours || !queueCapacity) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/admin/departments', {
        name,
        operatingHours,
        queueCapacity: parseInt(queueCapacity),
      });
      Alert.alert('Success', 'Department created successfully');
      setShowForm(false);
      setName('');
      setOperatingHours('');
      setQueueCapacity('');
      fetchDepartments();
    } catch (error) {
      Alert.alert('Error', 'Failed to create department');
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
        <Text style={styles.title}>Departments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Department</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Cardiology" placeholderTextColor={Colors.textDisabled} value={name} onChangeText={setName} />
          <Text style={styles.label}>Operating Hours</Text>
          <TextInput style={styles.input} placeholder="e.g. 08:00 - 17:00" placeholderTextColor={Colors.textDisabled} value={operatingHours} onChangeText={setOperatingHours} />
          <Text style={styles.label}>Queue Capacity</Text>
          <TextInput style={styles.input} placeholder="e.g. 100" placeholderTextColor={Colors.textDisabled} value={queueCapacity} onChangeText={setQueueCapacity} keyboardType="number-pad" />
          <TouchableOpacity style={[styles.createButton, submitting && styles.buttonDisabled]} onPress={handleCreate} disabled={submitting}>
            {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.createButtonText}>Create Department</Text>}
          </TouchableOpacity>
        </View>
      )}

      {departments.map(dept => (
        <View key={dept.id} style={styles.deptCard}>
          <View style={styles.deptHeader}>
            <Text style={styles.deptName}>{dept.name}</Text>
            <View style={[styles.activeBadge, { backgroundColor: dept.isActive ? Colors.successLight : Colors.dangerLight }]}>
              <Text style={[styles.activeText, { color: dept.isActive ? Colors.success : Colors.danger }]}>
                {dept.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text style={styles.deptHospital}>{dept.hospitalName}</Text>
          <View style={styles.deptMeta}>
            <Text style={styles.deptMetaText}>⏰ {dept.operatingHours}</Text>
            <Text style={styles.deptMetaText}>👥 Capacity: {dept.queueCapacity}</Text>
          </View>
        </View>
      ))}
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
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  createButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  createButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  deptCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  deptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  deptName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeText: { fontSize: 12, fontWeight: '600' },
  deptHospital: { fontSize: 12, color: Colors.textDisabled, marginBottom: 10 },
  deptMeta: { flexDirection: 'row', gap: 16 },
  deptMetaText: { fontSize: 13, color: Colors.textSecondary },
});