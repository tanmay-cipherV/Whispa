// src/screens/HomeScreen.js
import { useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '../api';
import { getMe, logout } from '../authStore';
import { connectSocket, disconnectSocket } from '../socket';

export default function HomeScreen({ navigation }) {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const currentUser = await getMe();
    setMe(currentUser);
    
    // Connect socket
    await connectSocket();
    
    // Get users
    const { data } = await api.get('/users');
    setUsers(data.filter(user => user._id !== currentUser._id));
  };

  const handleLogout = async () => {
    await logout();
    disconnectSocket();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const openChat = (user) => {
    navigation.navigate('Chat', {
      userId: user._id,
      username: user.username
    });
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => openChat(item)}>
      <Text style={styles.username}>{item.username}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {me?.username}!</Text>
        <Button title="Logout" onPress={handleLogout} />
      </View>

      <Text style={styles.title}>Users</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUser}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome: {
    fontSize: 18,
  },
  title: {
    fontSize: 20,
    marginBottom: 15,
  },
  userItem: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    borderRadius: 5,
  },
  username: {
    fontSize: 16,
  },
});