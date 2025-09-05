// mobile/src/socket.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { API_BASE } from './api';

let socket;

/*
  Connect to backend with socket.io
  - Includes token for authentication
*/
export async function connectSocket() {
  const token = await AsyncStorage.getItem('token');
  socket = io(API_BASE, { auth: { token } }); // pass token for secure connection
  return socket;
}

// Get existing socket (used in other files)
export function getSocket() { 
  return socket; 
}

// Disconnect when user logs out / app closes
export function disconnectSocket() { 
  if (socket) socket.disconnect(); 
}
