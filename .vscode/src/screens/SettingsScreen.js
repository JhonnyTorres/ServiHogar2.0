import { useNavigation } from "@react-navigation/native";
import colors from "../constants/colors";
import { View, Text, Alert, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useState } from "react";
import { signOut, auth } from '../services/firebaseService';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";


const SettingsScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        try {
            setLoading(true);
            await signOut(auth);
            Alert.alert('Sesión cerrada 😊', 'Has cerrado tu sesión correctamente', [
                {
                    text: 'OK', onPress: () => navigation
                        .reset({ index: 0, routes: [{ name: 'Login' }] })
                }
            ])
        } catch (error) {
            console.log('Error al cerrar sesión:', error)
            Alert.alert('Error 😵‍💫', 'No se pudo cerrar la sesión')
        } finally {
            setLoading(false);
        }
    };
    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <View style={styles.inner}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Ionicons name="settings-outline" size={28} color="#fff" />
                        <Text style={styles.title}>Ajustes</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.6)" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.settingLabel}>Configuración de cuenta</Text>
                            <Text style={styles.settingDescription}>Gestiona tu perfil y preferencias</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.logoutButton, loading && { opacity: 0.7 }]}
                        onPress={handleLogout}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#1e3a86" />
                        ) : (
                            <>
                                <Ionicons name="log-out-outline" size={18} color="#1e3a86" />
                                <Text style={styles.logoutText}>Cerrar sesión</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 24,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 20,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    settingDescription: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        marginTop: 2,
    },
    logoutButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e3a86',
    },
});

export default SettingsScreen;
