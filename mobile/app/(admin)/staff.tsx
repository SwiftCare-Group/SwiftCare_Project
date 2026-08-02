import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/errors';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';

type StaffRole = 'DOCTOR' | 'PHARMACIST' | 'LAB_TECHNICIAN';

type Department = {
  id: string;
  name: string;
  isActive?: boolean;
};

type StaffMember = {
  id: string;
  name?: string;
  email?: string;
  licenseNo?: string;
  departmentId?: string | null;
  departmentName?: string;
  role?: StaffRole;
  availableOnline?: boolean;
  isAvailableOnline?: boolean;
};

const ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function roleLabel(role?: StaffRole) {
  return ROLE_OPTIONS.find(option => option.value === role)?.label ?? 'Staff';
}

export default function StaffScreen() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffLoadError, setStaffLoadError] = useState<string | null>(null);
  const [departmentLoadError, setDepartmentLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [selectedRole, setSelectedRole] = useState<StaffRole>('DOCTOR');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const response = await api.get<StaffMember[]>('/admin/staff');
      setStaff(Array.isArray(response.data) ? response.data : []);
      setStaffLoadError(null);
    } catch (error) {
      setStaffLoadError(getApiErrorMessage(error, { fallback: 'Staff accounts could not be loaded.' }));
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const response = await api.get<Department[]>('/departments');
      const activeDepartments = (Array.isArray(response.data) ? response.data : [])
        .filter(department => department?.id && department?.name)
        .filter(department => department.isActive !== false);

      setDepartments(activeDepartments);
      setDepartmentLoadError(null);
      setSelectedDept(current => {
        if (current && activeDepartments.some(item => item.id === current)) {
          return current;
        }
        return activeDepartments[0]?.id ?? null;
      });
    } catch (error) {
      setDepartmentLoadError(
        getApiErrorMessage(error, { fallback: 'Departments could not be loaded. Create or activate a department first.' }),
      );
    }
  }, []);

  const fetchData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      await Promise.allSettled([loadStaff(), loadDepartments()]);
      setLoading(false);
      setRefreshing(false);
    },
    [loadDepartments, loadStaff],
  );

  useRefreshOnFocus(fetchData);

  const validationMessage = useMemo(() => {
    if (!name.trim()) return 'Enter the staff member’s full name.';
    if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid staff email address.';
    if (password.length < 8) return 'Use a temporary password with at least 8 characters.';
    if (!licenseNo.trim()) return 'Enter a license or staff number.';
    if (!selectedDept) return 'Select an active department.';
    return null;
  }, [email, licenseNo, name, password, selectedDept]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setLicenseNo('');
    setSelectedRole('DOCTOR');
    setSelectedDept(departments[0]?.id ?? null);
  };

  const handleCreate = async () => {
    if (submitting) {
      return;
    }

    if (validationMessage) {
      Alert.alert('Complete the form', validationMessage);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<StaffMember>('/admin/doctors', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        licenseNo: licenseNo.trim().toUpperCase(),
        departmentId: selectedDept,
        role: selectedRole,
      });

      if (response.data?.id) {
        setStaff(current => [response.data, ...current.filter(item => item.id !== response.data.id)]);
      } else {
        await loadStaff();
      }

      Alert.alert('Account created', `${roleLabel(selectedRole)} account created successfully.`);
      setShowForm(false);
      resetForm();
    } catch (error) {
      Alert.alert(
        'Unable to create account',
        getApiErrorMessage(error, { fallback: 'Review the entered details and try again.' }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading staff management…</Text>
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
            <Text style={styles.headerTitle}>Staff Management</Text>
            <Text style={styles.headerSubtitle}>{staff.length} active staff account(s)</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => void fetchData(true)}
              disabled={refreshing}
              accessibilityLabel="Refresh staff"
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
              accessibilityLabel={showForm ? 'Close staff form' : 'Add staff member'}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchData(true)}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {staffLoadError ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={20} color={Colors.danger} />
            <View style={styles.errorTextWrap}>
              <Text style={styles.errorTitle}>Staff list unavailable</Text>
              <Text style={styles.errorText}>{staffLoadError}</Text>
            </View>
            <TouchableOpacity onPress={() => void loadStaff()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Staff Account</Text>
            <Text style={styles.formSubtitle}>All fields are required.</Text>

            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              {ROLE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.roleOption,
                    selectedRole === option.value && styles.roleOptionSelected,
                  ]}
                  onPress={() => setSelectedRole(option.value)}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      selectedRole === option.value && styles.roleOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Kwame Mensah"
              placeholderTextColor={Colors.textDisabled}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!submitting}
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="staff@hospital.com"
              placeholderTextColor={Colors.textDisabled}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!submitting}
            />

            <Text style={styles.fieldLabel}>Temporary Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={Colors.textDisabled}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
            />

            <Text style={styles.fieldLabel}>License or Staff Number</Text>
            <TextInput
              style={styles.input}
              placeholder="GH-MED-001"
              placeholderTextColor={Colors.textDisabled}
              value={licenseNo}
              onChangeText={setLicenseNo}
              autoCapitalize="characters"
              editable={!submitting}
            />

            <View style={styles.departmentHeader}>
              <Text style={styles.fieldLabel}>Department</Text>
              {departmentLoadError ? (
                <TouchableOpacity onPress={() => void loadDepartments()}>
                  <Text style={styles.inlineRetry}>Reload</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {departmentLoadError ? (
              <Text style={styles.helperError}>{departmentLoadError}</Text>
            ) : departments.length === 0 ? (
              <Text style={styles.helperText}>Create and activate a department before adding staff.</Text>
            ) : (
              departments.map(department => (
                <TouchableOpacity
                  key={department.id}
                  style={[
                    styles.deptOption,
                    selectedDept === department.id && styles.deptOptionSelected,
                  ]}
                  onPress={() => setSelectedDept(department.id)}
                  disabled={submitting}
                >
                  <Ionicons
                    name={selectedDept === department.id ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={selectedDept === department.id ? Colors.primary : Colors.textDisabled}
                  />
                  <Text
                    style={[
                      styles.deptOptionText,
                      selectedDept === department.id && styles.deptOptionTextSelected,
                    ]}
                  >
                    {department.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}

            {validationMessage ? (
              <Text style={styles.validationHint}>{validationMessage}</Text>
            ) : (
              <Text style={styles.validHint}>Ready to create this staff account.</Text>
            )}

            <TouchableOpacity
              style={[styles.createButton, submitting && styles.buttonDisabled]}
              onPress={() => void handleCreate()}
              disabled={submitting}
              accessibilityState={{ disabled: submitting }}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.createButtonText}>Create Staff Account</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Staff ({staff.length})</Text>

        {staff.length === 0 && !staffLoadError ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyText}>No staff accounts yet</Text>
            <Text style={styles.emptySubtext}>Tap + to create the first account.</Text>
          </View>
        ) : (
          staff.map(member => {
            const displayName = member.name?.trim() || 'Unnamed staff';
            return (
              <View key={member.id} style={styles.doctorCard}>
                <View style={styles.doctorAvatar}>
                  <Text style={styles.doctorAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{displayName}</Text>
                  <Text style={styles.doctorDept}>
                    {roleLabel(member.role)} · {member.departmentName || 'Unassigned department'}
                  </Text>
                  <Text style={styles.doctorEmail}>{member.email || 'No email'}</Text>
                  <Text style={styles.staffNumber}>{member.licenseNo || 'No staff number'}</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleLabel(member.role)}</Text>
                </View>
              </View>
            );
          })
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
  loadingText: { marginTop: 10, color: Colors.textSecondary },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 10 },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.danger, backgroundColor: Colors.surface, borderRadius: 13, padding: 12, marginBottom: 16 },
  errorTextWrap: { flex: 1 },
  errorTitle: { color: Colors.danger, fontWeight: '700', fontSize: 13 },
  errorText: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  retryButton: { paddingHorizontal: 10, paddingVertical: 7 },
  retryText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  formCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  formSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: { borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  roleOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  roleOptionText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  roleOptionTextSelected: { color: Colors.primary },
  departmentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineRetry: { color: Colors.primary, fontSize: 12, fontWeight: '700', marginTop: 12 },
  deptOption: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, marginBottom: 6 },
  deptOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  deptOptionText: { fontSize: 14, color: Colors.textPrimary },
  deptOptionTextSelected: { color: Colors.primary, fontWeight: '600' },
  helperText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  helperError: { fontSize: 13, color: Colors.danger, marginTop: 4 },
  validationHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 12 },
  validHint: { fontSize: 12, color: Colors.success, marginTop: 12, fontWeight: '600' },
  createButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
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
  staffNumber: { fontSize: 10, color: Colors.textDisabled, marginTop: 2 },
  roleBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, maxWidth: 92 },
  roleBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: '700', textAlign: 'center' },
});
