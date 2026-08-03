import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, type AppColors } from '../../context/ThemeContext';
import api, { refreshSessionTokens } from '../../services/api';
import { getApiErrorMessage } from '../../utils/errors';
import { goBackOrReplace } from '../../utils/navigation';

function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function SubscriptionCheckoutScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{
    paymentUrl?: string | string[];
    reference?: string | string[];
  }>();

  const paymentUrl = singleParam(params.paymentUrl);
  const reference = singleParam(params.reference)?.trim();
  const verificationInFlight = useRef(false);

  const [verifying, setVerifying] = useState(false);
  const [webLoading, setWebLoading] = useState(true);
  const [webError, setWebError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const checkoutUrl = useMemo(
    () =>
      typeof paymentUrl === 'string' && /^https:\/\//i.test(paymentUrl)
        ? paymentUrl
        : null,
    [paymentUrl],
  );

  const verifyPayment = async () => {
    if (!reference || verificationInFlight.current || completed) {
      return;
    }

    verificationInFlight.current = true;
    setVerifying(true);

    try {
      const response = await api.post('/subscriptions/verify', { reference });
      const status = String(
        response.data?.status ?? response.data?.subscription?.status ?? ''
      ).toUpperCase();

      if (!['ACTIVE', 'SUCCESS', 'COMPLETED'].includes(status)) {
        throw new Error('The payment has not been confirmed yet.');
      }

      await refreshSessionTokens();
      setCompleted(true);

      Alert.alert(
        'Premium activated',
        'Your SwiftCare Premium subscription is active.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(patient)/profile'),
          },
        ],
      );
    } catch (error: unknown) {
      Alert.alert(
        'Payment not confirmed',
        getApiErrorMessage(error, {
          fallback: 'Complete the Paystack payment, then try verification again.',
          conflict: 'This payment reference has already been processed.',
          validation: 'The payment reference is invalid or incomplete.',
        }),
      );
    } finally {
      verificationInFlight.current = false;
      setVerifying(false);
    }
  };

  const isCallbackUrl = (url: string): boolean =>
    url.startsWith('swiftcare://subscription/callback') ||
    /\/subscriptions?\/callback/i.test(url);

  const handleNavigation = (navigation: WebViewNavigation) => {
    if (isCallbackUrl(navigation.url ?? '')) {
      void verifyPayment();
    }
  };

  if (!checkoutUrl || !reference) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="warning-outline" size={42} color={colors.danger} />
        <Text style={styles.errorTitle}>Checkout could not be opened</Text>
        <Text style={styles.errorText}>
          The payment URL or transaction reference is missing.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => goBackOrReplace(router, '/(patient)/profile')}
        >
          <Text style={styles.primaryButtonText}>Return to Profile</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Close payment and return to profile"
          onPress={() => goBackOrReplace(router, '/(patient)/profile')}
          disabled={verifying}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Secure Subscription Payment</Text>
          <Text style={styles.reference} numberOfLines={1}>
            Reference: {reference}
          </Text>
        </View>
      </View>

      <View style={styles.webContainer}>
        {webLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Opening Paystack checkout…</Text>
          </View>
        ) : null}

        {webError ? (
          <View style={styles.webErrorState}>
            <Ionicons name="cloud-offline-outline" size={42} color={colors.textDisabled} />
            <Text style={styles.errorTitle}>Payment page unavailable</Text>
            <Text style={styles.errorText}>{webError}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setWebError(null);
                setWebLoading(true);
                setWebViewKey(current => current + 1);
              }}
            >
              <Text style={styles.primaryButtonText}>Reload Checkout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            key={webViewKey}
            source={{ uri: checkoutUrl }}
            onLoadStart={() => {
              setWebError(null);
              setWebLoading(true);
            }}
            onLoadEnd={() => setWebLoading(false)}
            onError={() => {
              setWebLoading(false);
              setWebError('Check your internet connection and try again.');
            }}
            onHttpError={event => {
              setWebLoading(false);
              setWebError(
                `The payment provider returned status ${event.nativeEvent.statusCode}.`,
              );
            }}
            onNavigationStateChange={handleNavigation}
            onShouldStartLoadWithRequest={request => {
              if (isCallbackUrl(request.url)) {
                void verifyPayment();
                return false;
              }

              return /^https?:\/\//i.test(request.url) || request.url === 'about:blank';
            }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            sharedCookiesEnabled
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.helpText}>
          After Paystack confirms your payment, tap below if activation does not happen automatically.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, verifying && styles.disabled]}
          onPress={() => void verifyPayment()}
          disabled={verifying || completed}
        >
          {verifying ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {completed ? 'Premium Activated' : 'Verify and Activate Premium'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 68,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  reference: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  webContainer: { flex: 1, backgroundColor: colors.white, overflow: 'hidden' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 10 },
  webErrorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: colors.background,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  helpText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginTop: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});
