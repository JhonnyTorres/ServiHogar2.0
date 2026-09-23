import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import AppProvider from './navigation/AppProvider';
import { AuthProvider, useAuth } from './navigation/AuthContext';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import sqliteService from './src/services/sqliteService';
import { useNotificaciones } from './src/services/NotificationService';


function AppContent() {
  const { user } = useAuth();
  const navigationRef = useNavigationContainerRef();

  useNotificaciones(user?.uid, navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>
      <AppNavigator />
      <StatusBar />
    </NavigationContainer>
  );
}

export default function App() {

  useEffect(() => {
    sqliteService.init();
  }, []);

  return (
    <AppProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppProvider>
  );
}
