// src/screens/RegisterScreen.js
import { useState } from 'react';
import { Alert, Button, TextInput, View } from 'react-native';
import api from '../api';
import { saveAuth } from '../authStore';

export default function RegisterScreen({ navigation }) {
  // Form state (empty for new user registration)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Called when "Create account" button pressed
  const register = async () => {
    try {
      // Call backend /auth/register
      const { data } = await api.post('/auth/register', { username, password });

      // Save token + user in AsyncStorage
      await saveAuth(data.token, data.user);

      // Go to Home after successful registration
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      // Show error alert
      Alert.alert('Register failed', e?.response?.data?.error || 'Try again');
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      {/* Username input */}
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={{ borderWidth:1, padding:10, borderRadius:8 }}
      />

      {/* Password input */}
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth:1, padding:10, borderRadius:8 }}
      />

      {/* Register button */}
      <Button title="Create account" onPress={register}/>
    </View>
  );
}
