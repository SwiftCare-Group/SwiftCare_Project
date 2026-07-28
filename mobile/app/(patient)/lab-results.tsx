import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { goBackOrReplace } from '../../utils/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/errors';

type LabResult = {
  result?: string;
  interpretation?: string | null;
  notes?: string | null;
  performedBy?: string;
  performedAt?: string;
};

type LabOrder = {
  id: string;
  testName: string;
  doctorName?: string;
  clinicalReason?: string | null;
  status: 'ORDERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  orderedAt?: string;
  result?: LabResult | null;
};

export default function PatientLabResultsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await api.get('/lab-orders/patient/me');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error: unknown) {
      setLoadError(
        getApiErrorMessage(error, {
          fallback: 'Your laboratory orders could not be loaded.',
        })
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const formatDate = (value?: string) => {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.headerGradientStart }]}
      edges={['top']}
    >
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => goBackOrReplace(router, '/(patient)/home')}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Laboratory Results</Text>
          <Text style={styles.headerSubtitle}>Tests ordered by your care team</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadOrders();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {loadError ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.danger },
            ]}
          >
            <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Unable to load results</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{loadError}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => void loadOrders()}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : orders.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="flask-outline" size={44} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No laboratory orders</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Your tests and completed results will appear here.</Text>
          </View>
        ) : (
          orders.map(order => {
            const completed = order.status === 'COMPLETED' && order.result;
            return (
              <View
                key={order.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="flask-outline" size={21} color={colors.primary} />
                  </View>
                  <View style={styles.cardHeading}>
                    <Text style={[styles.testName, { color: colors.textPrimary }]}>{order.testName}</Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>{formatDate(order.orderedAt)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: completed ? colors.successLight : colors.warningLight }]}>
                    <Text style={[styles.badgeText, { color: completed ? colors.success : colors.warning }]}>
                      {order.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {order.doctorName ? (
                  <Text style={[styles.detail, { color: colors.textSecondary }]}>Ordered by Dr. {order.doctorName}</Text>
                ) : null}
                {order.clinicalReason ? (
                  <Text style={[styles.detail, { color: colors.textSecondary }]}>Reason: {order.clinicalReason}</Text>
                ) : null}

                {completed ? (
                  <View style={[styles.resultBox, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Result</Text>
                    <Text style={[styles.resultText, { color: colors.textPrimary }]}>{order.result?.result}</Text>
                    {order.result?.interpretation ? (
                      <Text style={[styles.interpretation, { color: colors.textSecondary }]}>Interpretation: {order.result.interpretation}</Text>
                    ) : null}
                    {order.result?.performedAt ? (
                      <Text style={[styles.performed, { color: colors.textDisabled }]}>Completed {formatDate(order.result.performedAt)}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={[styles.pendingText, { color: colors.textSecondary }]}>The laboratory has not released a result yet.</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 20 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerPlaceholder: { width: 40 },
  headerTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 3 },
  content: { padding: 20, paddingBottom: 110 },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: 34, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 14 },
  emptyText: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardHeading: { flex: 1 },
  testName: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3 },
  badge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  detail: { fontSize: 13, marginTop: 10 },
  resultBox: { borderRadius: 14, padding: 14, marginTop: 14 },
  resultLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  resultText: { fontSize: 15, lineHeight: 22, marginTop: 6 },
  interpretation: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  performed: { fontSize: 11, marginTop: 10 },
  pendingText: { fontSize: 13, fontStyle: 'italic', marginTop: 14 },
  retryButton: { marginTop: 18, minWidth: 130, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
