import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

type RemainingDrug = {
  drugName?: string;
};

type Prescription = {
  id: string;
  issuedAt?: string;
  drugs?: string[];
  qrCodeData?: string;
};

export default function PrescriptionScreen() {
  const { colors } = useTheme();

  const [prescriptions, setPrescriptions] = useState<
    Prescription[]
  >([]);

  const [remaining, setRemaining] = useState<
    Record<string, RemainingDrug[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [expandedQr, setExpandedQr] =
    useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const prescriptionResponse =
        await api.get('/prescriptions/my');

      const prescriptionList = Array.isArray(
        prescriptionResponse.data
      )
        ? prescriptionResponse.data
        : [];

      setPrescriptions(prescriptionList);

      const remainingMap: Record<
        string,
        RemainingDrug[]
      > = {};

      await Promise.all(
        prescriptionList.map(
          async (prescription: Prescription) => {
            try {
              const remainingResponse =
                await api.get(
                  `/prescriptions/${prescription.id}/remaining`
                );

              remainingMap[prescription.id] =
                Array.isArray(remainingResponse.data)
                  ? remainingResponse.data
                  : [];
            } catch (error) {
              console.error(
                `Failed to fetch remaining drugs for prescription ${prescription.id}:`,
                error
              );

              remainingMap[prescription.id] = [];
            }
          }
        )
      );

      setRemaining(remainingMap);
    } catch (error) {
      console.error(
        'Failed to fetch prescriptions:',
        error
      );

      setPrescriptions([]);
      setRemaining({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return 'Date unavailable';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleQrCode = (prescriptionId: string) => {
    setExpandedQr(current =>
      current === prescriptionId
        ? null
        : prescriptionId
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          Loading prescriptions…
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.headerGradientStart,
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
        <Text style={styles.headerTitle}>
          Prescriptions
        </Text>

        <Text style={styles.headerSubtitle}>
          Present the QR code at the pharmacy to collect
          your medication
        </Text>
      </LinearGradient>

      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {prescriptions.length === 0 ? (
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
                  backgroundColor:
                    colors.primaryLight,
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
                styles.emptyText,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              No prescriptions yet
            </Text>

            <Text
              style={[
                styles.emptySubtext,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Prescriptions will appear here after a
              doctor completes your consultation.
            </Text>
          </View>
        ) : (
          prescriptions.map(prescription => {
            const remainingDrugs =
              remaining[prescription.id] || [];

            const allDispensed =
              remainingDrugs.length === 0;

            const drugs = Array.isArray(
              prescription.drugs
            )
              ? prescription.drugs
              : [];

            const qrExpanded =
              expandedQr === prescription.id;

            return (
              <View
                key={prescription.id}
                style={[
                  styles.prescriptionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.rxBadge,
                      {
                        backgroundColor:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rxText,
                        {
                          color: colors.primary,
                        },
                      ]}
                    >
                      Rx
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text
                      style={[
                        styles.prescId,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      #
                      {prescription.id
                        .slice(0, 8)
                        .toUpperCase()}
                    </Text>

                    <Text
                      style={[
                        styles.prescDate,
                        {
                          color:
                            colors.textSecondary,
                        },
                      ]}
                    >
                      Issued{' '}
                      {formatDate(
                        prescription.issuedAt
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: allDispensed
                          ? colors.successLight
                          : colors.warningLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: allDispensed
                            ? colors.success
                            : colors.warning,
                        },
                      ]}
                    >
                      {allDispensed
                        ? 'Complete'
                        : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.divider,
                    {
                      backgroundColor: colors.border,
                    },
                  ]}
                />

                {/* Drugs */}
                <View style={styles.drugsSection}>
                  <Text
                    style={[
                      styles.drugsTitle,
                      {
                        color: colors.textDisabled,
                      },
                    ]}
                  >
                    Prescribed Drugs
                  </Text>

                  {drugs.length === 0 ? (
                    <Text
                      style={[
                        styles.noDrugText,
                        {
                          color:
                            colors.textSecondary,
                        },
                      ]}
                    >
                      No drug information available.
                    </Text>
                  ) : (
                    drugs.map((drug, index) => {
                      const isRemaining =
                        remainingDrugs.some(
                          remainingDrug =>
                            remainingDrug.drugName ===
                            drug
                        );

                      return (
                        <View
                          key={`${drug}-${index}`}
                          style={[
                            styles.drugRow,
                            {
                              borderBottomColor:
                                colors.border,
                            },
                          ]}
                        >
                          <View
                            style={styles.drugLeft}
                          >
                            <Ionicons
                              name={
                                isRemaining
                                  ? 'ellipse-outline'
                                  : 'checkmark-circle'
                              }
                              size={19}
                              color={
                                isRemaining
                                  ? colors.textDisabled
                                  : colors.success
                              }
                            />

                            <Text
                              style={[
                                styles.drugName,
                                {
                                  color:
                                    colors.textPrimary,
                                },
                              ]}
                            >
                              {drug}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.drugBadge,
                              {
                                backgroundColor:
                                  isRemaining
                                    ? colors.warningLight
                                    : colors.successLight,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.drugBadgeText,
                                {
                                  color: isRemaining
                                    ? colors.warning
                                    : colors.success,
                                },
                              ]}
                            >
                              {isRemaining
                                ? 'Pending'
                                : 'Dispensed'}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* QR toggle */}
                <TouchableOpacity
                  style={styles.qrButton}
                  activeOpacity={0.8}
                  onPress={() =>
                    toggleQrCode(
                      prescription.id
                    )
                  }
                >
                  <LinearGradient
                    colors={
                      qrExpanded
                        ? [
                            colors.headerGradientStart,
                            colors.headerGradientEnd,
                          ]
                        : [
                            colors.primaryLight,
                            colors.primaryLight,
                          ]
                    }
                    style={styles.qrButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons
                      name="qr-code-outline"
                      size={19}
                      color={
                        qrExpanded
                          ? colors.white
                          : colors.primary
                      }
                    />

                    <Text
                      style={[
                        styles.qrButtonText,
                        {
                          color: qrExpanded
                            ? colors.white
                            : colors.primary,
                        },
                      ]}
                    >
                      {qrExpanded
                        ? 'Hide QR Code'
                        : 'Show QR Code'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Expanded QR */}
                {qrExpanded ? (
                  prescription.qrCodeData ? (
                    <View
                      style={[
                        styles.qrContainer,
                        {
                          backgroundColor:
                            colors.surfaceSecondary,
                          borderColor:
                            colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.qrImageContainer,
                          {
                            backgroundColor:
                              colors.white,
                          },
                        ]}
                      >
                        <Image
                          source={{
                            uri: `data:image/png;base64,${prescription.qrCodeData}`,
                          }}
                          style={styles.qrImage}
                          resizeMode="contain"
                        />
                      </View>

                      <Text
                        style={[
                          styles.qrHint,
                          {
                            color:
                              colors.textSecondary,
                          },
                        ]}
                      >
                        Present this QR code at the
                        pharmacy to collect your
                        medication.
                      </Text>

                      {remainingDrugs.length > 0 ? (
                        <View
                          style={[
                            styles.remainingHint,
                            {
                              backgroundColor:
                                colors.warningLight,
                            },
                          ]}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={16}
                            color={colors.warning}
                          />

                          <Text
                            style={[
                              styles.remainingHintText,
                              {
                                color:
                                  colors.warning,
                              },
                            ]}
                          >
                            {remainingDrugs.length}{' '}
                            drug
                            {remainingDrugs.length ===
                            1
                              ? ''
                              : 's'}{' '}
                            still pending collection
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.remainingHint,
                            {
                              backgroundColor:
                                colors.successLight,
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={16}
                            color={colors.success}
                          />

                          <Text
                            style={[
                              styles.remainingHintText,
                              {
                                color:
                                  colors.success,
                              },
                            ]}
                          >
                            All medication has been
                            dispensed.
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.qrUnavailable,
                        {
                          backgroundColor:
                            colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="qr-code-outline"
                        size={28}
                        color={colors.textDisabled}
                      />

                      <Text
                        style={[
                          styles.qrUnavailableText,
                          {
                            color:
                              colors.textSecondary,
                          },
                        ]}
                      >
                        QR code is not available for
                        this prescription.
                      </Text>
                    </View>
                  )
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
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

  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },

  headerSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 4,
    maxWidth: 320,
  },

  emptyState: {
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 28,
    paddingVertical: 44,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptySubtext: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 290,
  },

  prescriptionCard: {
    borderRadius: 17,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  rxBadge: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rxText: {
    fontSize: 17,
    fontWeight: '800',
    fontStyle: 'italic',
  },

  cardInfo: {
    flex: 1,
  },

  prescId: {
    fontSize: 15,
    fontWeight: '700',
  },

  prescDate: {
    fontSize: 12,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginVertical: 16,
  },

  drugsSection: {
    marginBottom: 16,
  },

  drugsTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  noDrugText: {
    fontSize: 13,
    paddingVertical: 10,
  },

  drugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },

  drugLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 10,
  },

  drugName: {
    flex: 1,
    fontSize: 14,
  },

  drugBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  drugBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  qrButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  qrButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },

  qrButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  qrContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    alignItems: 'center',
  },

  qrImageContainer: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 13,
  },

  qrImage: {
    width: 210,
    height: 210,
  },

  qrHint: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },

  remainingHint: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },

  remainingHintText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  qrUnavailable: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 22,
    marginTop: 14,
    alignItems: 'center',
  },

  qrUnavailableText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 9,
  },
});