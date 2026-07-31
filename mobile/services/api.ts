import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PATH = '/api/v1';
const DEFAULT_TIMEOUT_MS = 240_000;
const AUTH_TIMEOUT_MS = 240_000;
const WAKE_TIMEOUT_MS = 240_000;
const MAX_COLD_START_RETRIES = 2;
const COLD_START_RETRY_DELAY_MS = 12_000;
const GATEWAY_WARM_TTL_MS = 10 * 60_000;

const SESSION_STORAGE_KEYS = [
  'accessToken',
  'refreshToken',
  'userRole',
] as const;

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
  _coldStartRetryCount?: number;
};

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

  // Expo commonly returns a value such as 192.168.1.4:8081.
  return hostUri.split(':')[0] || null;
};

const resolveApiBaseUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // Production and shared-device testing must use the public API gateway.
  if (configuredUrl) {
    return withApiPath(configuredUrl);
  }

  // Local Expo Go fallback for a gateway running on the same computer.
  const expoHost = getExpoHost();
  if (expoHost && expoHost !== 'localhost') {
    return `http://${expoHost}:8080${API_PATH}`;
  }

  // Android emulators reach the host machine through 10.0.2.2.
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:8080${API_PATH}`;
  }

  return `http://localhost:8080${API_PATH}`;
};

const delay = (milliseconds: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const isSafeToRetry = (method?: string): boolean =>
  ['get', 'head', 'options'].includes(String(method ?? '').toLowerCase());

const isPossibleColdStart = (error: AxiosError): boolean => {
  const status = error.response?.status;

  return (
    error.code === 'ECONNABORTED' ||
    !error.response ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_GATEWAY_ORIGIN = withoutApiPath(API_BASE_URL);

const IS_RENDER_GATEWAY = API_GATEWAY_ORIGIN
  .toLowerCase()
  .includes('.onrender.com');

const gatewayClient = axios.create({
  baseURL: API_GATEWAY_ORIGIN,
  timeout: WAKE_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
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

export const clearLocalSession = async (): Promise<void> => {
  await AsyncStorage.multiRemove([...SESSION_STORAGE_KEYS]);
};

let gatewayWakePromise: Promise<boolean> | null = null;
let lastGatewayResponseAt = 0;

export const wakeGateway = async (): Promise<boolean> => {
  if (gatewayWakePromise) {
    return gatewayWakePromise;
  }

  const wakePromise = (async () => {
    try {
      // Any response proves that Render received the request and woke the gateway.
      await gatewayClient.get('/actuator/health/liveness', {
        validateStatus: () => true,
      });
      lastGatewayResponseAt = Date.now();
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('[SwiftCare API] Gateway wake-up failed:', error);
      }
      return false;
    } finally {
      gatewayWakePromise = null;
    }
  })();

  gatewayWakePromise = wakePromise;
  return wakePromise;
};

export const logoutSession = async (): Promise<void> => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');

  try {
    if (refreshToken) {
      await authClient.post('/auth/logout', { refreshToken });
    }
  } catch {
    // Local sign-out must still complete during a temporary server outage.
  } finally {
    await clearLocalSession();
  }
};

let refreshPromise: Promise<string | null> | null = null;

export const refreshSessionTokens = async (): Promise<string | null> => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await authClient.post('/auth/refresh', {
      refreshToken,
    });

    const newAccessToken = response.data?.accessToken;
    const newRefreshToken = response.data?.refreshToken;

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
      updates.push(['refreshToken', newRefreshToken]);
    }

    await AsyncStorage.multiSet(updates);
    return newAccessToken;
  } catch {
    return null;
  }
};

api.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    if (
      IS_RENDER_GATEWAY &&
      Date.now() - lastGatewayResponseAt > GATEWAY_WARM_TTL_MS
    ) {
      await wakeGateway();
    }

    const accessToken = await AsyncStorage.getItem('accessToken');
    const headers = AxiosHeaders.from(config.headers);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    config.headers = headers;

    if (__DEV__) {
      console.log(
        `[SwiftCare API →] ${String(config.method ?? 'GET').toUpperCase()} ` +
          `${config.baseURL ?? ''}${config.url ?? ''}`,
      );
    }

    return config;
  },
  error => Promise.reject(error),
);

api.interceptors.response.use(
  response => {
    if (__DEV__) {
      console.log(
        `[SwiftCare API ←] ${response.status} ` +
          `${response.config.baseURL ?? ''}${response.config.url ?? ''}`,
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
        `[SwiftCare API ←] ${error.response?.status ?? error.code ?? 'NO_RESPONSE'} ` +
          `${originalRequest?.baseURL ?? ''}${originalRequest?.url ?? ''}`,
      );
    }

    if (
      originalRequest &&
      isSafeToRetry(originalRequest.method) &&
      isPossibleColdStart(error)
    ) {
      const retryCount = originalRequest._coldStartRetryCount ?? 0;

      if (retryCount < MAX_COLD_START_RETRIES) {
        originalRequest._coldStartRetryCount = retryCount + 1;

        await wakeGateway();
        await delay(COLD_START_RETRY_DELAY_MS * (retryCount + 1));

        return api(originalRequest);
      }
    }

    const isUnauthorized = error.response?.status === 401;
    const requestUrl = originalRequest?.url ?? '';

    const isLoginRequest = requestUrl.includes('/auth/login');
    const isRegisterRequest = requestUrl.includes('/auth/register');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');
    const isLogoutRequest = requestUrl.includes('/auth/logout');

    const canAttemptRefresh =
      isUnauthorized &&
      originalRequest &&
      !originalRequest._authRetry &&
      !isLoginRequest &&
      !isRegisterRequest &&
      !isRefreshRequest &&
      !isLogoutRequest;

    if (canAttemptRefresh) {
      originalRequest._authRetry = true;

      refreshPromise ??= refreshSessionTokens().finally(() => {
        refreshPromise = null;
      });

      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        const headers = AxiosHeaders.from(originalRequest.headers);
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        originalRequest.headers = headers;

        return api(originalRequest);
      }
    }

    if (isUnauthorized && !isLoginRequest && !isRegisterRequest) {
      await clearLocalSession();
    }

    return Promise.reject(error);
  },
);

export default api;
