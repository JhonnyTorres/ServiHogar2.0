import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import AppProvider from './navigation/AppProvider';
import { AuthProvider } from './navigation/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import sqliteService from './src/services/sqliteService';

export default function App() {

  useEffect(() => {
    sqliteService.init();
  }, []);

  return (
    <AppProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar />
        </NavigationContainer>
      </AuthProvider>
    </AppProvider>
  );
}

