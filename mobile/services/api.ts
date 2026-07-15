import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  // Android emulator:
  // baseURL: 'http://10.0.2.2:8080/api/v1',

  // Physical iPhone connected to your phone hotspot:
  baseURL: 'http://172.20.10.3:8080/api/v1',

  timeout: 10000,
});

api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('accessToken');
    }

    return Promise.reject(error);
  }
);

export default api;