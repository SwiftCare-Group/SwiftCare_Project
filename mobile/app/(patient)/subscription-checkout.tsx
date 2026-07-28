import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { Colors } from '../../constants/colors';
import api, { refreshSessionTokens } from '../../services/api';

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

export default function SubscriptionCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    paymentUrl?: string | string[];
    reference?: string | string[];
  }>();

  const paymentUrl = singleParam(params.paymentUrl);
  const reference = singleParam(params.reference);
  const [verifying, setVerifying] = useState(false);
  const [webLoading, setWebLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  const checkoutUrl = useMemo(
    () =>
      typeof paymentUrl === 'string' && /^https:\/\//i.test(paymentUrl)
        ? paymentUrl
        : null,
    [paymentUrl],
  );

  const verifyPayment = async () => {
    if (!reference || verifying || completed) return;
    setVerifying(true);
    try {
      const response = await api.post('/subscriptions/verify', { reference });
      if (response.data?.status !== 'ACTIVE') {
        throw new Error('The payment has not been confirmed yet.');
      }

      await refreshSessionTokens();
      setCompleted(true);
      Alert.alert(
        'Premium activated',
        'Your SwiftCare Premium subscription is active.',
        [{ text: 'Continue', onPress: () => router.replace('/(patient)/profile') }],
      );
    } catch (error) {
      Alert.alert(
        'Payment not confirmed',
        getErrorMessage(
          error,
          error instanceof Error
            ? error.message
            : 'Complete the Paystack payment, then try verification again.',
        ),
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleNavigation = (navigation: WebViewNavigation) => {
    const url = navigation.url ?? '';
    if (
      url.startsWith('swiftcare://subscription/callback') ||
      url.includes('/subscription/callback')
    ) {
      void verifyPayment();
    }
  };

  if (!checkoutUrl || !reference) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="warning-outline" size={42} color={Colors.danger} />
        <Text style={styles.errorTitle}>Checkout could not be opened</Text>
        <Text style={styles.errorText}>The payment URL or transaction reference is missing.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Return to Profile</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Secure Subscription Payment</Text>
          <Text style={styles.reference}>Reference: {reference}</Text>
        </View>
      </View>

      <View style={styles.webContainer}>
        {webLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Opening Paystack checkout…</Text>
          </View>
        ) : null}
        <WebView
          source={{ uri: checkoutUrl }}
          onLoadStart={() => setWebLoading(true)}
          onLoadEnd={() => setWebLoading(false)}
          onNavigationStateChange={handleNavigation}
          onShouldStartLoadWithRequest={request => {
            if (request.url.startsWith('swiftcare://subscription/callback')) {
              void verifyPayment();
              return false;
            }
            return true;
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          sharedCookiesEnabled
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.helpText}>
          After Paystack confirms your payment, tap the button below if activation does not happen automatically.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, verifying && styles.disabled]}
          onPress={() => void verifyPayment()}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Verify and Activate Premium</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  reference: { color: Colors.textSecondary, fontSize: 10, marginTop: 2 },
  webContainer: { flex: 1, backgroundColor: Colors.white },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  loadingText: { color: Colors.textSecondary, fontSize: 13, marginTop: 10 },
  footer: { padding: 16, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  helpText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  primaryButton: { minHeight: 48, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, marginTop: 16 },
  primaryButtonText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  errorTitle: { color: Colors.textPrimary, fontSize: 19, fontWeight: '700', marginTop: 14 },
  errorText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
});
