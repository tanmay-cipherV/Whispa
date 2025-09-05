// mobile/src/authStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';

/*
  Save token + user details locally
  - Stored in phone/browser storage so user stays logged in
*/
export async function saveAuth(token, user) {
  await AsyncStorage.setItem('token', token);
  await AsyncStorage.setItem('user', JSON.stringify(user));
}

/*
  Get logged-in user details from storage
*/
export async function getMe() {
  const u = await AsyncStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

/*
  Remove user + token (logout)
*/
export async function logout() {
  await AsyncStorage.multiRemove(['token','user']);
}
