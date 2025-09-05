// App.js
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';

import { getMe, logout } from './src/authStore';
import ChatScreen from './src/screens/ChatScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { connectSocket, disconnectSocket } from './src/socket';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if user is already logged in
      const me = await getMe();
      
      if (me) {
        // User is logged in, connect to socket
        try {
          await connectSocket();
          setInitialRoute('Home');
        } catch (socketError) {
          console.log('Socket connection failed, logging out user:', socketError);
          // If socket connection fails, logout user and go to login
          await logout();
          setInitialRoute('Login');
        }
      } else {
        // No user logged in, go to login screen
        setInitialRoute('Login');
      }
    } catch (error) {
      console.log('App initialization error:', error);
      // Default to login screen on any error
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle app cleanup when component unmounts
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  // Show loading spinner while determining initial route
  if (isLoading || !initialRoute) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{ 
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: '#f8f9fa',
            },
            headerTintColor: '#333',
            headerTitleStyle: {
              fontWeight: 'bold',
            }
          }}
        >
          {/* Auth Screens */}
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ 
              title: 'Whispa',
              headerShown: true 
            }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{ 
              title: 'Create Account',
              headerShown: true 
            }}
          />

          {/* Main App Screens */}
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ 
              title: 'Messages',
              headerShown: true 
            }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={({ route }) => ({ 
              title: route.params?.username || 'Chat',
              headerShown: true,
              headerBackTitleVisible: false
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  }
});