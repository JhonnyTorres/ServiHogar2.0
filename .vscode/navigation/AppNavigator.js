import React from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from './AuthContext';

import SplashScreen from '../src/screens/SplashScreen';
import LoginScreen from '../src/screens/auth/LoginScreen';
import RegisterScreen from '../src/screens/auth/RegisterScreen';
import RoleSelectionScreen from '../src/screens/auth/RoleSelectionScreen';
import ProfessionalProfileScreen from '../src/screens/auth/ProfessionalProfileScreen';
import EmailVerificationScreen from '../src/screens/auth/EmailVerificationScreen';
import HomeScreen from '../src/screens/HomeScreen';
import UserScreen from '../src/screens/UserScreen';
import SettingsScreen from '../src/screens/SettingsScreen';
import ClientServicesScreen from '../src/screens/ClientServicesScreen';
import SearchProfessionalsScreen from '../src/screens/SearchProfessionalsScreen';
import ProfessionalServicesScreen from '../src/screens/ProfessionalServicesScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Tab Navigator ────────────────────────────────────────────────────────────
const TabNavigator = () => {
    const { user, rol } = useAuth();

    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size, focused }) => {
                    let iconName;
                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    } else if (route.name === 'User') {
                        if (user?.photoURL) {
                            return (
                                <Image
                                    source={{ uri: user.photoURL }}
                                    style={{
                                        width: size, height: size,
                                        borderRadius: size / 2,
                                        borderWidth: focused ? 2 : 0,
                                        borderColor: focused ? '#024d6b' : 'transparent',
                                    }}
                                />
                            );
                        }
                        return (
                            <Ionicons
                                name={focused ? 'person' : 'person-outline'}
                                size={size} color={color}
                            />
                        );
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#0077B6',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: 'Home' }}
            />

            {/* Solo para clientes */}
            {rol === 'cliente' && (
                <Tab.Screen
                    name="Buscar"
                    component={SearchProfessionalsScreen}
                    options={{
                        tabBarLabel: 'Buscar',
                        tabBarIcon: ({ color, size, focused }) => (
                            <Ionicons
                                name={focused ? 'search' : 'search-outline'}
                                size={size} color={color}
                            />
                        ),
                    }}
                />
            )}

            {rol === 'cliente' && (
                <Tab.Screen
                    name="MisServicios"
                    component={ClientServicesScreen}
                    options={{
                        tabBarLabel: 'Mis servicios',
                        tabBarIcon: ({ color, size, focused }) => (
                            <Ionicons
                                name={focused ? 'clipboard' : 'clipboard-outline'}
                                size={size} color={color}
                            />
                        ),
                    }}
                />
            )}

            {/* Solo para profesionales */}
            {rol === 'profesional' && (
                <Tab.Screen
                    name="MisSolicitudes"
                    component={ProfessionalServicesScreen}
                    options={{
                        tabBarLabel: 'Solicitudes',
                        tabBarIcon: ({ color, size, focused }) => (
                            <Ionicons
                                name={focused ? 'briefcase' : 'briefcase-outline'}
                                size={size} color={color}
                            />
                        ),
                    }}
                />
            )}

            <Tab.Screen
                name="User"
                component={UserScreen}
                options={{ tabBarLabel: 'Usuario' }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ tabBarLabel: 'Ajustes' }}
            />
        </Tab.Navigator>
    );
};

// ─── App Navigator ────────────────────────────────────────────────────────────
const AppNavigator = () => {
    const { user, emailVerified, loading } = useAuth();

    if (loading) return <SplashScreen />;

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                // ── Sin sesión ────────────────────────────────────────────────
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                    <Stack.Screen name="ProfessionalProfile" component={ProfessionalProfileScreen} />
                </>
            ) : !emailVerified ? (
                // ── Con sesión pero sin verificar correo ──────────────────────
                <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            ) : (
                // ── Sesión activa y correo verificado ─────────────────────────
                <Stack.Screen name="Main" component={TabNavigator} />
            )}
        </Stack.Navigator>
    );
};

export default AppNavigator;