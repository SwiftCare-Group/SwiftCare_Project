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
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { getApiErrorMessage } from '../../utils/errors';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';

type Department = {
  id: string;
  name: string;
  hospitalName?: string;
  operatingHours: string;
  queueCapacity: number;
  isActive: boolean;
};

export default function DepartmentsScreen() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [queueCapacity, setQueueCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    }

    try {
      const response = await api.get<Department[]>('/departments');
      setDepartments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      Alert.alert(
        'Unable to load departments',
        getApiErrorMessage(error, { fallback: 'Check your connection and try again.' }),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useRefreshOnFocus(() => fetchDepartments());

  const resetForm = () => {
    setName('');
    setOperatingHours('');
    setQueueCapacity('');
  };

  const handleCreate = async () => {
    if (submitting) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedHours = operatingHours.trim();
    const parsedCapacity = Number.parseInt(queueCapacity, 10);
    const hoursPattern = /^(?:[01]\d|2[0-3]):[0-5]\d\s*-\s*(?:[01]\d|2[0-3]):[0-5]\d$/;

    if (!normalizedName || !normalizedHours || !queueCapacity.trim()) {
      Alert.alert('Missing information', 'Complete every field before creating the department.');
      return;
    }

    if (!hoursPattern.test(normalizedHours)) {
      Alert.alert('Invalid operating hours', 'Use the format HH:mm - HH:mm, for example 08:00 - 17:00.');
      return;
    }

    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 10000) {
      Alert.alert('Invalid queue capacity', 'Enter a whole number between 1 and 10,000.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/admin/departments', {
        name: normalizedName,
        operatingHours: normalizedHours,
        queueCapacity: parsedCapacity,
      });
      Alert.alert('Department created', `${normalizedName} is now available for appointments.`);
      setShowForm(false);
      resetForm();
      await fetchDepartments();
    } catch (error) {
      Alert.alert(
        'Unable to create department',
        getApiErrorMessage(error, { fallback: 'Review the details and try again.' }),
      );
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
          <View>
            <Text style={styles.headerTitle}>Departments</Text>
            <Text style={styles.headerSubtitle}>{departments.length} active departments</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => void fetchDepartments(true)}
              disabled={refreshing}
              accessibilityLabel="Refresh departments"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="refresh" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(current => !current)}
              accessibilityLabel={showForm ? 'Close department form' : 'Add department'}
            >
              <Ionicons name={showForm ? 'close' : 'add'} size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Department</Text>

            <Text style={styles.fieldLabel}>Department Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cardiology"
              placeholderTextColor={Colors.textDisabled}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Operating Hours</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 08:00 - 17:00"
              placeholderTextColor={Colors.textDisabled}
              value={operatingHours}
              onChangeText={setOperatingHours}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Daily Queue Capacity</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 100"
              placeholderTextColor={Colors.textDisabled}
              value={queueCapacity}
              onChangeText={setQueueCapacity}
              keyboardType="number-pad"
            />

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

        {departments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={34} color={Colors.primary} />
            <Text style={styles.emptyTitle}>No active departments</Text>
            <Text style={styles.emptyText}>Tap + to configure the first department.</Text>
          </View>
        ) : (
          departments.map(department => (
            <View key={department.id} style={styles.deptCard}>
              <View style={styles.deptHeader}>
                <View style={styles.deptIcon}>
                  <Ionicons name="business-outline" size={20} color={Colors.primary} />
                </View>
                <View style={styles.deptInfo}>
                  <Text style={styles.deptName}>{department.name}</Text>
                  <Text style={styles.deptHospital}>{department.hospitalName || 'SwiftCare Hospital'}</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeText}>Active</Text>
                </View>
              </View>
              <View style={styles.deptMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.textDisabled} />
                  <Text style={styles.metaText}>{department.operatingHours}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={13} color={Colors.textDisabled} />
                  <Text style={styles.metaText}>Daily capacity: {department.queueCapacity}</Text>
                </View>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  formCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
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
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.successLight },
  activeText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  deptMeta: { gap: 7 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: Colors.textDisabled },
  emptyState: { alignItems: 'center', paddingVertical: 70 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { marginTop: 4, fontSize: 13, color: Colors.textSecondary },
});
