import { useTheme, type AppColors } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useRef, useState } from 'react';
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
const STAFF_REQUEST_TIMEOUT_MS = 45_000;
const FOCUS_REFRESH_TTL_MS = 30_000;

function roleLabel(role?: StaffRole) {
  return ROLE_OPTIONS.find(option => option.value === role)?.label ?? 'Staff';
}

export default function StaffScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
  const loadInFlightRef = useRef(false);
  const lastLoadedAtRef = useRef(0);

  const loadStaff = useCallback(async () => {
    try {
      const response = await api.get<StaffMember[]>('/admin/staff', {
        timeout: STAFF_REQUEST_TIMEOUT_MS,
        _skipServiceStartup: true,
      } as any);
      setStaff(Array.isArray(response.data) ? response.data : []);
      setStaffLoadError(null);
    } catch (error) {
      setStaffLoadError(getApiErrorMessage(error, { fallback: 'Staff accounts could not be loaded.' }));
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const response = await api.get<Department[]>('/departments', {
        timeout: STAFF_REQUEST_TIMEOUT_MS,
        _skipServiceStartup: true,
      } as any);
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
      const recentlyLoaded =
        Date.now() - lastLoadedAtRef.current < FOCUS_REFRESH_TTL_MS;

      if ((!showRefreshIndicator && recentlyLoaded) || loadInFlightRef.current) {
        return;
      }

      loadInFlightRef.current = true;

      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        await Promise.allSettled([loadStaff(), loadDepartments()]);
        lastLoadedAtRef.current = Date.now();
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
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
              disabled={refreshing || loading}
              accessibilityLabel="Refresh staff"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(current => !current)}
              accessibilityLabel={showForm ? 'Close staff form' : 'Add staff member'}
            >
              <Ionicons name={showForm ? 'close' : 'add'} size={20} color={colors.primary} />
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
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <View style={styles.errorTextWrap}>
              <Text style={styles.loadingCardTitle}>Loading staff accounts</Text>
              <Text style={styles.loadingCardText}>This may take a moment if the service is waking up.</Text>
            </View>
          </View>
        ) : null}

        {!loading && staffLoadError ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
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
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!submitting}
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="staff@hospital.com"
              placeholderTextColor={colors.textDisabled}
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
              placeholderTextColor={colors.textDisabled}
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
              placeholderTextColor={colors.textDisabled}
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
                    color={selectedDept === department.id ? colors.primary : colors.textDisabled}
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
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.createButtonText}>Create Staff Account</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Staff ({staff.length})</Text>

        {!loading && staff.length === 0 && !staffLoadError ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={32} color={colors.primary} />
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

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.headerGradientStart },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 10, color: colors.textSecondary },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 13, padding: 14, marginBottom: 16 },
  loadingCardTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  loadingCardText: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 10 },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.surface, borderRadius: 13, padding: 12, marginBottom: 16 },
  errorTextWrap: { flex: 1 },
  errorTitle: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  errorText: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  retryButton: { paddingHorizontal: 10, paddingVertical: 7 },
  retryText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  formCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  formTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  formSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.textPrimary },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  roleOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleOptionText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  roleOptionTextSelected: { color: colors.primary },
  departmentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineRetry: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 12 },
  deptOption: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 6 },
  deptOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  deptOptionText: { fontSize: 14, color: colors.textPrimary },
  deptOptionTextSelected: { color: colors.primary, fontWeight: '600' },
  helperText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  helperError: { fontSize: 13, color: colors.danger, marginTop: 4 },
  validationHint: { fontSize: 12, color: colors.textSecondary, marginTop: 12 },
  validHint: { fontSize: 12, color: colors.success, marginTop: 12, fontWeight: '600' },
  createButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  createButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  emptySubtext: { fontSize: 13, color: colors.textDisabled, marginTop: 4 },
  doctorCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border },
  doctorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  doctorAvatarText: { fontSize: 20, fontWeight: '700', color: colors.white },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  doctorDept: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  doctorEmail: { fontSize: 11, color: colors.textDisabled, marginTop: 1 },
  staffNumber: { fontSize: 10, color: colors.textDisabled, marginTop: 2 },
  roleBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, maxWidth: 92 },
  roleBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '700', textAlign: 'center' },
});
