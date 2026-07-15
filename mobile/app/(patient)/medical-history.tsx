import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

type AppointmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

type MedicalHistoryItem = {
  id: string;
  departmentName?: string;
  scheduledTime: string;
  status: AppointmentStatus;
  queuePosition?: number;
  severityScore?: number;
  doctorName?: string;
  diagnosis?: string;
  prescriptionStatus?: string;
};

type FilterType = 'ALL' | 'COMPLETED' | 'CANCELLED';

export default function MedicalHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [records, setRecords] = useState<MedicalHistoryItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMedicalHistory();
  }, []);

  const fetchMedicalHistory = async () => {
    try {
      const response = await api.get('/appointments');

      const appointments = Array.isArray(response.data)
        ? response.data
        : [];

      const historyRecords = appointments
        .filter(
          (appointment: MedicalHistoryItem) =>
            appointment.status === 'COMPLETED' ||
            appointment.status === 'CANCELLED'
        )
        .sort(
          (
            first: MedicalHistoryItem,
            second: MedicalHistoryItem
          ) =>
            new Date(second.scheduledTime).getTime() -
            new Date(first.scheduledTime).getTime()
        );

      setRecords(historyRecords);
    } catch (error) {
      console.error('Failed to fetch medical history:', error);
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (filter === 'ALL') {
      return records;
    }

    return records.filter(record => record.status === filter);
  }, [filter, records]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedicalHistory();
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return colors.success;

      case 'CANCELLED':
        return colors.danger;

      case 'ACTIVE':
        return colors.primary;

      default:
        return colors.warning;
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.headerGradientStart,
        },
      ]}
      edges={['top']}
    >
      <LinearGradient
        colors={[
          colors.headerGradientStart,
          colors.headerGradientEnd,
        ]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.white}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Medical History</Text>
            <Text style={styles.headerSubtitle}>
              Previous appointments and care records
            </Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.summaryIcon,
              {
                backgroundColor: colors.primaryLight,
              },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.summaryContent}>
            <Text
              style={[
                styles.summaryTitle,
                { color: colors.textPrimary },
              ]}
            >
              Care Timeline
            </Text>

            <Text
              style={[
                styles.summarySubtitle,
                { color: colors.textSecondary },
              ]}
            >
              {records.length} previous record
              {records.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['ALL', 'COMPLETED', 'CANCELLED'] as FilterType[]).map(
            item => {
              const selected = filter === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : colors.surface,
                      borderColor: selected
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() => setFilter(item)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color: selected
                          ? colors.white
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {item === 'ALL'
                      ? 'All'
                      : item.charAt(0) +
                        item.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {filteredRecords.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={38}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                { color: colors.textPrimary },
              ]}
            >
              No medical history yet
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: colors.textSecondary },
              ]}
            >
              Completed and cancelled appointments will appear here.
            </Text>
          </View>
        ) : (
          filteredRecords.map(record => {
            const statusColor = getStatusColor(record.status);

            return (
              <View
                key={record.id}
                style={[
                  styles.historyCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.departmentIcon,
                      {
                        backgroundColor: colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.cardHeaderText}>
                    <Text
                      style={[
                        styles.departmentName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {record.departmentName ||
                        'Hospital Department'}
                    </Text>

                    <Text
                      style={[
                        styles.appointmentDate,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatDate(record.scheduledTime)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: `${statusColor}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColor },
                      ]}
                    >
                      {record.status}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border },
                  ]}
                />

                <View style={styles.detailsGrid}>
                  <DetailItem
                    icon="person-outline"
                    label="Doctor"
                    value={record.doctorName || 'Not assigned'}
                    colors={colors}
                  />

                  <DetailItem
                    icon="list-outline"
                    label="Queue"
                    value={
                      record.queuePosition
                        ? `#${record.queuePosition}`
                        : 'Not recorded'
                    }
                    colors={colors}
                  />

                  <DetailItem
                    icon="analytics-outline"
                    label="Severity"
                    value={
                      record.severityScore !== undefined
                        ? `${record.severityScore}/10`
                        : 'Not recorded'
                    }
                    colors={colors}
                  />

                  <DetailItem
                    icon="medical-outline"
                    label="Prescription"
                    value={
                      record.prescriptionStatus || 'Not available'
                    }
                    colors={colors}
                  />
                </View>

                {record.diagnosis ? (
                  <View
                    style={[
                      styles.diagnosisBox,
                      {
                        backgroundColor: colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.diagnosisLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Diagnosis
                    </Text>

                    <Text
                      style={[
                        styles.diagnosisText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {record.diagnosis}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type DetailItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
};

function DetailItem({
  icon,
  label,
  value,
  colors,
}: DetailItemProps) {
  return (
    <View style={styles.detailItem}>
      <View
        style={[
          styles.detailIcon,
          {
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={15}
          color={colors.textSecondary}
        />
      </View>

      <View style={styles.detailText}>
        <Text
          style={[
            styles.detailLabel,
            { color: colors.textDisabled },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.detailValue,
            { color: colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 20,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
    alignItems: 'center',
  },

  headerPlaceholder: {
    width: 40,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 3,
  },

  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  summaryContent: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  summarySubtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },

  filterButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },

  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    padding: 34,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  historyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  departmentIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  cardHeaderText: {
    flex: 1,
    paddingRight: 8,
  },

  departmentName: {
    fontSize: 15,
    fontWeight: '700',
  },

  appointmentDate: {
    fontSize: 12,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginVertical: 14,
  },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  detailItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  detailText: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },

  diagnosisBox: {
    marginTop: 15,
    borderRadius: 10,
    padding: 12,
  },

  diagnosisLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  diagnosisText: {
    fontSize: 13,
    fontWeight: '600',
  },
});