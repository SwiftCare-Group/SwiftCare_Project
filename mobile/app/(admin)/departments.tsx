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

export default function DepartmentsScreen() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [queueCapacity, setQueueCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchDepartments(); }, []);

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
        name, operatingHours,
        queueCapacity: parseInt(queueCapacity),
      });
      Alert.alert('Success', 'Department created');
      setShowForm(false);
      setName(''); setOperatingHours(''); setQueueCapacity('');
      fetchDepartments();
    } catch {
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[Colors.headerGradientStart, Colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Departments</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(!showForm)}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{departments.length} departments configured</Text>
      </LinearGradient>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Department</Text>
            {[
              { label: 'Department Name', value: name, setter: setName, placeholder: 'e.g. Cardiology' },
              { label: 'Operating Hours', value: operatingHours, setter: setOperatingHours, placeholder: 'e.g. 08:00 - 17:00' },
              { label: 'Queue Capacity', value: queueCapacity, setter: setQueueCapacity, placeholder: 'e.g. 100', keyboard: 'number-pad' as any },
            ].map(field => (
              <View key={field.label}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textDisabled}
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.keyboard || 'default'}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.createButton, submitting && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.createButtonText}>Create Department</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {departments.map(dept => (
          <View key={dept.id} style={styles.deptCard}>
            <View style={styles.deptHeader}>
              <View style={styles.deptIcon}>
                <Ionicons name="business-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.deptInfo}>
                <Text style={styles.deptName}>{dept.name}</Text>
                <Text style={styles.deptHospital}>{dept.hospitalName}</Text>
              </View>
              <View style={[
                styles.activeBadge,
                { backgroundColor: dept.isActive ? Colors.successLight : Colors.dangerLight }
              ]}>
                <Text style={[
                  styles.activeText,
                  { color: dept.isActive ? Colors.success : Colors.danger }
                ]}>
                  {dept.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.deptMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={Colors.textDisabled} />
                <Text style={styles.metaText}>{dept.operatingHours}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color={Colors.textDisabled} />
                <Text style={styles.metaText}>Cap: {dept.queueCapacity}</Text>
              </View>
            </View>
          </View>
        ))}
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
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  createButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  createButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  deptCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  deptHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  deptIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  deptInfo: { flex: 1 },
  deptName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  deptHospital: { fontSize: 12, color: Colors.textDisabled, marginTop: 2 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeText: { fontSize: 12, fontWeight: '600' },
  deptMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textDisabled },
});