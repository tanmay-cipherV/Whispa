// mobile/src/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

/*
  🔑 API_BASE setup
  - If running app in web browser -> use localhost (backend on same machine)
  - If running app on phone (Expo Go) -> replace with your laptop's IP
    Example: "http://192.168.1.5:4000"
*/
export const API_BASE = 'http://localhost:4000'; // change manually when testing on phone

// Create an axios instance pointing to our backend
const api = axios.create({ baseURL: API_BASE });

// Attach token (if exists) to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
