import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import api, { logoutSession } from '../../services/api';
import SwiftCareLogo from '../../components/branding/SwiftCareLogo';
import { getApiErrorMessage } from '../../utils/errors';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';

type LabOrder = {
  id: string;
  patientName: string;
  doctorName: string;
  testName: string;
  clinicalReason?: string | null;
  instructions?: string | null;
  status: 'ORDERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  orderedAt: string;
};

export default function LabDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [result, setResult] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [notes, setNotes] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await api.get('/lab-orders/pending');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error: unknown) {
      setLoadError(
        getApiErrorMessage(error, {
          fallback: 'Laboratory orders could not be loaded.',
        }),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useRefreshOnFocus(fetchOrders);

  const startOrder = async (order: LabOrder) => {
    setUpdatingId(order.id);
    try {
      await api.patch(`/lab-orders/${order.id}/start`);
      await fetchOrders();
    } catch (error: any) {
      Alert.alert(
        'Update failed',
        getApiErrorMessage(error, {
          fallback: 'The order could not be started.',
          conflict: 'This laboratory order has already changed status.',
        }),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const closeResultModal = () => {
    if (updatingId) {
      return;
    }

    setSelectedOrder(null);
    setResult('');
    setInterpretation('');
    setNotes('');
  };

  const openResultModal = async (order: LabOrder) => {
    if (updatingId) {
      return;
    }

    if (order.status === 'ORDERED') {
      setUpdatingId(order.id);
      try {
        await api.patch(`/lab-orders/${order.id}/start`);
        setSelectedOrder({ ...order, status: 'IN_PROGRESS' });
      } catch (error: unknown) {
        Alert.alert(
          'Unable to start test',
          getApiErrorMessage(error, {
            fallback: 'The laboratory test could not be started.',
            conflict: 'This order has already changed status. Refresh the queue.',
          }),
        );
      } finally {
        setUpdatingId(null);
      }
      return;
    }

    setSelectedOrder(order);
  };

  const submitResult = async () => {
    if (!selectedOrder || !result.trim()) {
      Alert.alert(
        'Missing information',
        'A laboratory result is required.',
      );
      return;
    }

    setUpdatingId(selectedOrder.id);
    try {
      await api.patch(`/lab-orders/${selectedOrder.id}/result`, {
        result: result.trim(),
        interpretation: interpretation.trim() || null,
        notes: notes.trim() || null,
      });

      setSelectedOrder(null);
      setResult('');
      setInterpretation('');
      setNotes('');
      await fetchOrders();
      Alert.alert('Result saved', 'The laboratory result is now available to the care team.');
    } catch (error: any) {
      Alert.alert(
        'Result not saved',
        getApiErrorMessage(error, {
          fallback: 'Please check the form and try again.',
          validation: 'Review the laboratory result and try again.',
          conflict: 'This laboratory order has already been completed or cancelled.',
        }),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const logout = async () => {
    await logoutSession();
    router.replace('/(auth)/staff-login');
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
          <View style={styles.headerIdentity}>
            <SwiftCareLogo size={46} compact />
            <View>
              <Text style={styles.title}>Laboratory Queue</Text>
              <Text style={styles.subtitle}>{orders.length} pending order(s)</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={21} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loadError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={21} color={Colors.danger} />
          <View style={styles.errorBannerContent}>
            <Text style={styles.errorBannerTitle}>Unable to load laboratory queue</Text>
            <Text style={styles.errorBannerText}>{loadError}</Text>
          </View>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void fetchOrders()}
            accessibilityLabel="Retry loading laboratory orders"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void fetchOrders();
            }}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          loadError ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="flask-outline" size={44} color={Colors.primary} />
              <Text style={styles.emptyTitle}>No pending lab orders</Text>
              <Text style={styles.emptyText}>
                New orders will appear here automatically.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.testIcon}>
                <Ionicons name="flask-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.cardTitleArea}>
                <Text style={styles.testName}>{item.testName}</Text>
                <Text style={styles.patientName}>{item.patientName}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
              </View>
            </View>

            {item.clinicalReason ? (
              <Text style={styles.detail}>Reason: {item.clinicalReason}</Text>
            ) : null}
            {item.instructions ? (
              <Text style={styles.detail}>Instructions: {item.instructions}</Text>
            ) : null}
            <Text style={styles.meta}>Ordered by Dr. {item.doctorName}</Text>

            <View style={styles.actions}>
              {item.status === 'ORDERED' ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => void startOrder(item)}
                  disabled={updatingId === item.id}
                >
                  <Text style={styles.secondaryButtonText}>Start</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => void openResultModal(item)}
                disabled={updatingId === item.id}
              >
                <Text style={styles.primaryButtonText}>Record Result</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal
        visible={selectedOrder !== null}
        transparent
        animationType="slide"
        onRequestClose={closeResultModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.modalCard}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.modalTitle}>Record laboratory result</Text>
              <Text style={styles.modalSubtitle}>{selectedOrder?.testName}</Text>

              <TextInput
                style={[styles.input, styles.multiline]}
                value={result}
                onChangeText={setResult}
                placeholder="Result"
                placeholderTextColor={Colors.textDisabled}
                multiline
                returnKeyType="default"
              />
              <TextInput
                style={styles.input}
                value={interpretation}
                onChangeText={setInterpretation}
                placeholder="Interpretation (optional)"
                placeholderTextColor={Colors.textDisabled}
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optional)"
                placeholderTextColor={Colors.textDisabled}
                returnKeyType="done"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeResultModal}
                  disabled={updatingId !== null}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => void submitResult()}
                  disabled={updatingId !== null}
                >
                  {updatingId ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Result</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.headerGradientStart },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.78)', marginTop: 3 },
  logoutButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  list: { padding: 18, paddingBottom: 40, backgroundColor: Colors.background, flexGrow: 1 },
  errorBanner: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  errorBannerContent: { flex: 1 },
  errorBannerTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  errorBannerText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2 },
  retryButton: { paddingHorizontal: 10, paddingVertical: 8 },
  retryButtonText: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  testIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardTitleArea: { flex: 1, marginLeft: 12 },
  testName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  patientName: { marginTop: 2, color: Colors.textSecondary },
  statusBadge: { backgroundColor: Colors.warningLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { color: Colors.warning, fontSize: 11, fontWeight: '700' },
  detail: { color: Colors.textPrimary, lineHeight: 20, marginBottom: 5 },
  meta: { color: Colors.textSecondary, fontSize: 12, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  secondaryButtonText: { color: Colors.primary, fontWeight: '700' },
  primaryButton: { flex: 2, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryButtonText: { color: Colors.white, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 90 },
  emptyTitle: { marginTop: 16, fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { marginTop: 6, color: Colors.textSecondary, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', overflow: 'hidden' },
  modalContent: { padding: 22, paddingBottom: 34 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  modalSubtitle: { color: Colors.textSecondary, marginTop: 3, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, color: Colors.textPrimary, marginBottom: 10 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelButton: { flex: 1, paddingVertical: 13, borderRadius: 11, backgroundColor: Colors.surfaceSecondary, alignItems: 'center' },
  cancelButtonText: { color: Colors.textSecondary, fontWeight: '700' },
  saveButton: { flex: 1.5, paddingVertical: 13, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center' },
  saveButtonText: { color: Colors.white, fontWeight: '700' },
});
