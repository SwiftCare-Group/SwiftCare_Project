import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  BackendService,
  configureServiceStartupManager,
  ensureServiceStarted,
  markServiceUnavailable,
} from '../src/services/serviceStartupManager';

const API_PATH = '/api/v1';

const DEFAULT_TIMEOUT_MS = 240_000;
const AUTH_TIMEOUT_MS = 240_000;
const GATEWAY_WAKE_TIMEOUT_MS = 240_000;

const SESSION_STORAGE_KEYS = [
  'accessToken',
  'refreshToken',
  'userRole',
] as const;

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
  _skipServiceStartup?: boolean;
};

/* ============================================================
 * URL CONFIGURATION
 * ============================================================
 */

const stripTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, '');

const withApiPath = (value: string): string => {
  const normalized = stripTrailingSlash(value.trim());

  if (!normalized) {
    throw new Error('The configured API URL is empty.');
  }

  return normalized.endsWith(API_PATH)
    ? normalized
    : `${normalized}${API_PATH}`;
};

const withoutApiPath = (value: string): string => {
  const normalized = stripTrailingSlash(value);

  return normalized.endsWith(API_PATH)
    ? normalized.slice(0, -API_PATH.length)
    : normalized;
};

const getExpoHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    null;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0] || null;
};

const resolveApiBaseUrl = (): string => {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return withApiPath(configuredUrl);
  }

  const expoHost = getExpoHost();

  /*
   * Physical device using Expo Go on the same Wi-Fi/hotspot
   * as the computer running the local API gateway.
   */
  if (expoHost && expoHost !== 'localhost') {
    return `http://${expoHost}:8080${API_PATH}`;
  }

  /*
   * Android emulator uses 10.0.2.2 to reach the host PC.
   */
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:8080${API_PATH}`;
  }

  /*
   * iOS simulator and web running on the development computer.
   */
  return `http://localhost:8080${API_PATH}`;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const API_GATEWAY_ORIGIN =
  withoutApiPath(API_BASE_URL);

const IS_RENDER_GATEWAY = API_GATEWAY_ORIGIN
  .toLowerCase()
  .includes('.onrender.com');

/*
 * Render services can sleep and require readiness checks.
 * Local services must receive requests immediately because the
 * local gateway does not expose the Render wake-up health routes.
 */
const SHOULD_CHECK_SERVICE_READINESS =
  IS_RENDER_GATEWAY;

configureServiceStartupManager(API_BASE_URL);

/* ============================================================
 * REQUEST PATH MAPPING
 * ============================================================
 */

const normalizeRequestPath = (
  requestUrl?: string,
): string => {
  if (!requestUrl) {
    return '/';
  }

  let path = requestUrl;

  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    try {
      path = new URL(path).pathname;
    } catch {
      // Continue using the original value.
    }
  }

  const withoutQuery =
    path.split('?')[0] ?? path;

  const normalized = withoutQuery.startsWith('/')
    ? withoutQuery
    : `/${withoutQuery}`;

  if (normalized.startsWith(API_PATH)) {
    return normalized.slice(API_PATH.length) || '/';
  }

  return normalized;
};

const resolveServiceForRequest = (
  requestUrl?: string,
): BackendService | null => {
  const path = normalizeRequestPath(
    requestUrl,
  ).toLowerCase();

  /*
   * Health requests must never trigger another readiness check.
   */
  if (
    path.startsWith('/system/') ||
    path.startsWith('/actuator/')
  ) {
    return null;
  }

  if (
    path === '/auth' ||
    path.startsWith('/auth/') ||
    path === '/patients' ||
    path.startsWith('/patients/') ||
    path === '/profile' ||
    path.startsWith('/profile/')
  ) {
    return 'identity';
  }

  if (
    path === '/appointments' ||
    path.startsWith('/appointments/') ||
    path === '/departments' ||
    path.startsWith('/departments/') ||
    path === '/slots' ||
    path.startsWith('/slots/') ||
    path === '/queue' ||
    path.startsWith('/queue/') ||
    path === '/admin/departments' ||
    path.startsWith('/admin/departments/') ||
    path === '/admin/stats' ||
    path.startsWith('/admin/stats/')
  ) {
    return 'appointment';
  }

  if (
    path === '/consultations' ||
    path.startsWith('/consultations/') ||
    path === '/doctors' ||
    path.startsWith('/doctors/') ||
    path === '/clinical-records' ||
    path.startsWith('/clinical-records/') ||
    path === '/prescriptions' ||
    path.startsWith('/prescriptions/') ||
    path === '/lab-orders' ||
    path.startsWith('/lab-orders/') ||
    path === '/lab-results' ||
    path.startsWith('/lab-results/') ||
    path === '/admin/doctors' ||
    path.startsWith('/admin/doctors/') ||
    path === '/admin/staff' ||
    path.startsWith('/admin/staff/')
  ) {
    return 'clinical';
  }

  if (
    path === '/symptoms' ||
    path.startsWith('/symptoms/')
  ) {
    return 'symptom';
  }

  if (
    path === '/subscriptions' ||
    path.startsWith('/subscriptions/') ||
    path === '/payments' ||
    path.startsWith('/payments/')
  ) {
    return 'subscription';
  }

  if (
    path === '/notifications' ||
    path.startsWith('/notifications/')
  ) {
    return 'notification';
  }

  return null;
};

const waitForServiceWhenRequired = async (
  service: BackendService | null,
): Promise<void> => {
  if (
    !SHOULD_CHECK_SERVICE_READINESS ||
    !service
  ) {
    return;
  }

  await ensureServiceStarted(service);
};

/* ============================================================
 * AXIOS CLIENTS
 * ============================================================
 */

const gatewayClient = axios.create({
  baseURL: API_GATEWAY_ORIGIN,
  timeout: GATEWAY_WAKE_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
  },
});

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: AUTH_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

/* ============================================================
 * SESSION STORAGE
 * ============================================================
 */

export const clearLocalSession =
  async (): Promise<void> => {
    await AsyncStorage.multiRemove([
      ...SESSION_STORAGE_KEYS,
    ]);
  };

/* ============================================================
 * GATEWAY WAKE-UP
 * ============================================================
 */

let gatewayWakePromise:
  | Promise<boolean>
  | null = null;

export const wakeGateway =
  async (): Promise<boolean> => {
    if (!IS_RENDER_GATEWAY) {
      return true;
    }

    if (gatewayWakePromise) {
      return gatewayWakePromise;
    }

    gatewayWakePromise = (async () => {
      try {
        if (__DEV__) {
          console.log(
            '[Gateway startup] Checking API gateway...',
          );
        }

        const response = await gatewayClient.get(
          '/actuator/health/liveness',
          {
            validateStatus: () => true,
          },
        );

        const ready =
          response.status >= 200 &&
          response.status < 300;

        if (__DEV__) {
          console.log(
            `[Gateway startup] ${
              ready
                ? 'READY'
                : `returned ${response.status}`
            }`,
          );
        }

        return ready;
      } catch (error) {
        if (__DEV__) {
          console.warn(
            '[Gateway startup] Wake-up failed:',
            error,
          );
        }

        return false;
      } finally {
        gatewayWakePromise = null;
      }
    })();

    return gatewayWakePromise;
  };

/* ============================================================
 * SERVICE FAILURE DETECTION
 * ============================================================
 */

const isServiceFailure = (
  error: AxiosError,
): boolean => {
  const status = error.response?.status;

  return (
    !error.response ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
};

/* ============================================================
 * LOGOUT
 * ============================================================
 */

export const logoutSession =
  async (): Promise<void> => {
    const refreshToken =
      await AsyncStorage.getItem('refreshToken');

    try {
      if (refreshToken) {
        await waitForServiceWhenRequired(
          'identity',
        );

        await authClient.post('/auth/logout', {
          refreshToken,
        });
      }
    } catch (error) {
      if (
        SHOULD_CHECK_SERVICE_READINESS &&
        axios.isAxiosError(error) &&
        isServiceFailure(error)
      ) {
        markServiceUnavailable('identity');
      }
    } finally {
      await clearLocalSession();
    }
  };

/* ============================================================
 * TOKEN REFRESH
 * ============================================================
 */

let refreshPromise:
  | Promise<string | null>
  | null = null;

export const refreshSessionTokens =
  async (): Promise<string | null> => {
    const refreshToken =
      await AsyncStorage.getItem('refreshToken');

    if (!refreshToken) {
      return null;
    }

    try {
      await waitForServiceWhenRequired(
        'identity',
      );

      const response = await authClient.post(
        '/auth/refresh',
        {
          refreshToken,
        },
      );

      const newAccessToken =
        response.data?.accessToken;

      const newRefreshToken =
        response.data?.refreshToken;

      if (
        typeof newAccessToken !== 'string' ||
        newAccessToken.trim().length === 0
      ) {
        return null;
      }

      const updates: [string, string][] = [
        ['accessToken', newAccessToken],
      ];

      if (
        typeof newRefreshToken === 'string' &&
        newRefreshToken.trim().length > 0
      ) {
        updates.push([
          'refreshToken',
          newRefreshToken,
        ]);
      }

      await AsyncStorage.multiSet(updates);

      return newAccessToken;
    } catch (error) {
      if (
        SHOULD_CHECK_SERVICE_READINESS &&
        axios.isAxiosError(error) &&
        isServiceFailure(error)
      ) {
        markServiceUnavailable('identity');
      }

      return null;
    }
  };

/* ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 */

api.interceptors.request.use(
  async (
    config: RetryableRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const requiredService =
      resolveServiceForRequest(config.url);

    if (!config._skipServiceStartup) {
      await waitForServiceWhenRequired(
        requiredService,
      );
    }

    const accessToken =
      await AsyncStorage.getItem('accessToken');

    const headers = AxiosHeaders.from(
      config.headers,
    );

    if (accessToken) {
      headers.set(
        'Authorization',
        `Bearer ${accessToken}`,
      );
    }

    config.headers = headers;

    if (__DEV__) {
      console.log(
        `[SwiftCare API →] ${String(
          config.method ?? 'GET',
        ).toUpperCase()} ` +
          `${config.baseURL ?? ''}` +
          `${config.url ?? ''}`,
      );
    }

    return config;
  },
  error => Promise.reject(error),
);

/* ============================================================
 * RESPONSE INTERCEPTOR
 * ============================================================
 */

api.interceptors.response.use(
  response => {
    if (__DEV__) {
      console.log(
        `[SwiftCare API ←] ${response.status} ` +
          `${response.config.baseURL ?? ''}` +
          `${response.config.url ?? ''}`,
      );
    }

    return response;
  },

  async (error: AxiosError) => {
    const originalRequest = error.config as
      | RetryableRequestConfig
      | undefined;

    if (__DEV__) {
      console.warn(
        `[SwiftCare API ←] ${
          error.response?.status ??
          error.code ??
          'NO_RESPONSE'
        } ` +
          `${originalRequest?.baseURL ?? ''}` +
          `${originalRequest?.url ?? ''}`,
      );
    }

    const affectedService =
      resolveServiceForRequest(
        originalRequest?.url,
      );

    if (
      SHOULD_CHECK_SERVICE_READINESS &&
      affectedService &&
      isServiceFailure(error)
    ) {
      markServiceUnavailable(
        affectedService,
      );
    }

    const isUnauthorized =
      error.response?.status === 401;

    const requestUrl =
      originalRequest?.url ?? '';

    const isLoginRequest =
      requestUrl.includes('/auth/login');

    const isRegisterRequest =
      requestUrl.includes('/auth/register');

    const isEmailVerificationRequest =
      requestUrl.includes('/auth/verify-email') ||
      requestUrl.includes('/auth/resend-verification');

    const isRefreshRequest =
      requestUrl.includes('/auth/refresh');

    const isLogoutRequest =
      requestUrl.includes('/auth/logout');

    const canAttemptRefresh =
      isUnauthorized &&
      originalRequest !== undefined &&
      !originalRequest._authRetry &&
      !isLoginRequest &&
      !isRegisterRequest &&
      !isEmailVerificationRequest &&
      !isRefreshRequest &&
      !isLogoutRequest;

    if (
      canAttemptRefresh &&
      originalRequest
    ) {
      originalRequest._authRetry = true;

      refreshPromise ??=
        refreshSessionTokens().finally(() => {
          refreshPromise = null;
        });

      const newAccessToken =
        await refreshPromise;

      if (newAccessToken) {
        const headers = AxiosHeaders.from(
          originalRequest.headers,
        );

        headers.set(
          'Authorization',
          `Bearer ${newAccessToken}`,
        );

        originalRequest.headers = headers;

        return api(originalRequest);
      }
    }

    if (
      isUnauthorized &&
      !isLoginRequest &&
      !isRegisterRequest &&
      !isEmailVerificationRequest &&
      !isRefreshRequest
    ) {
      await clearLocalSession();
    }

    return Promise.reject(error);
  },
);

export default api;