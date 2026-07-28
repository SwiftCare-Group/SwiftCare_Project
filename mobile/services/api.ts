import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PATH = '/api/v1';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const withApiPath = (value: string): string => {
  const normalized = stripTrailingSlash(value.trim());
  return normalized.endsWith(API_PATH) ? normalized : `${normalized}${API_PATH}`;
};

const getExpoHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    null;

  if (!hostUri) {
    return null;
  }

  // Expo host values may include a Metro port, for example 192.168.1.4:8081.
  return hostUri.split(':')[0] || null;
};

const resolveApiBaseUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return withApiPath(configuredUrl);
  }

  const expoHost = getExpoHost();
  if (expoHost) {
    return `http://${expoHost}:8080${API_PATH}`;
  }

  // Android emulators cannot reach the host machine through localhost.
  if (Platform.OS === 'android') {
    return `http://172.20.10.3:8080${API_PATH}`;
  }

  return `http://localhost:8080${API_PATH}`;
};

export const API_BASE_URL = resolveApiBaseUrl();

const SESSION_STORAGE_KEYS = [
  'accessToken',
  'refreshToken',
  'userRole',
] as const;

export const clearLocalSession = async (): Promise<void> => {
  await AsyncStorage.multiRemove([...SESSION_STORAGE_KEYS]);
};

export const logoutSession = async (): Promise<void> => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');

  try {
    if (refreshToken) {
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        { refreshToken },
        { timeout: 10000 },
      );
    }
  } catch {
    // Local sign-out must still complete when the server is unavailable.
  } finally {
    await clearLocalSession();
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let refreshPromise: Promise<string | null> | null = null;

export const refreshSessionTokens = async (): Promise<string | null> => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 15000 },
    );

    const newAccessToken = response.data?.accessToken;
    const newRefreshToken = response.data?.refreshToken;

    if (typeof newAccessToken !== 'string' || !newAccessToken) {
      return null;
    }

    const updates: [string, string][] = [['accessToken', newAccessToken]];
    if (typeof newRefreshToken === 'string' && newRefreshToken) {
      updates.push(['refreshToken', newRefreshToken]);
    }

    await AsyncStorage.multiSet(updates);
    return newAccessToken;
  } catch {
    return null;
  }
};

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const isUnauthorized = error.response?.status === 401;
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

    if (
      isUnauthorized &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;
      refreshPromise ??= refreshSessionTokens().finally(() => {
        refreshPromise = null;
      });

      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }
    }

    if (isUnauthorized) {
      await clearLocalSession();
    }

    return Promise.reject(error);
  },
);

export default api;
