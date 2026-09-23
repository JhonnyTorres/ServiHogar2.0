import { useState } from "react";
import {
    StyleSheet, TextInput, View, Text,
    TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../services/firebaseService";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Completa todos los campos');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (e) {
            switch (e.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('Correo o contraseña incorrectos'); break;
                case 'auth/invalid-email':
                    setError('El correo no tiene un formato válido'); break;
                case 'auth/too-many-requests':
                    setError('Demasiados intentos. Intenta más tarde'); break;
                default:
                    setError('Error al iniciar sesión. Intenta de nuevo');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Logo */}
                <View style={styles.logoCircle}>
                    <Ionicons name="home" size={28} color="#fff" />
                </View>
                <Text style={styles.appName}>ServiHogar</Text>
                <Text style={styles.appSub}>Servicios para el hogar</Text>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Iniciar sesión</Text>
                    <Text style={styles.cardSub}>Bienvenido de nuevo</Text>

                    {/* Email */}
                    <View style={[styles.inputWrap, error && styles.inputError]}>
                        <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.6)" />
                        <TextInput
                            style={styles.input}
                            placeholder="Correo electrónico"
                            placeholderTextColor="rgba(255,255,255,0.45)"
                            value={email}
                            onChangeText={t => { setEmail(t); setError(''); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Contraseña */}
                    <View style={[styles.inputWrap, error && styles.inputError]}>
                        <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.6)" />
                        <TextInput
                            style={styles.input}
                            placeholder="Contraseña"
                            placeholderTextColor="rgba(255,255,255,0.45)"
                            value={password}
                            onChangeText={t => { setPassword(t); setError(''); }}
                            secureTextEntry={!showPass}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                            <Ionicons
                                name={showPass ? 'eye-off-outline' : 'eye-outline'}
                                size={18}
                                color="rgba(255,255,255,0.5)"
                            />
                        </TouchableOpacity>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle-outline" size={14} color="#ff6b6b" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#1e3a86" />
                            : <Text style={styles.btnPrimaryText}>Iniciar sesión</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.btnLink}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.btnLinkText}>
                            ¿No tienes cuenta?{' '}
                            <Text style={styles.btnLinkHighlight}>Regístrate</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1, justifyContent: 'center',
        alignItems: 'center', paddingHorizontal: 24,
    },

    logoCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    appName: {
        fontSize: 26, fontWeight: '800',
        color: '#fff', letterSpacing: 0.5,
    },
    appSub: {
        fontSize: 13, color: 'rgba(255,255,255,0.6)',
        marginTop: 4, marginBottom: 28, textAlign: 'center', width: '100%'
    },

    card: {
        width: '100%', maxWidth: 400,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 24, padding: 24,
    },
    cardTitle: {
        fontSize: 22, fontWeight: '700',
        color: '#fff', marginBottom: 4,
    },
    cardSub: {
        fontSize: 13, color: 'rgba(255,255,255,0.55)',
        marginBottom: 20,
    },

    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
        marginBottom: 12,
    },
    inputError: { borderColor: 'rgba(255,107,107,0.6)' },
    input: {
        flex: 1, fontSize: 14,
        color: '#fff',
    },

    errorBox: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,107,107,0.12)',
        borderRadius: 8, padding: 10, marginBottom: 12,
    },
    errorText: { fontSize: 13, color: '#ff6b6b', flex: 1 },

    btnPrimary: {
        backgroundColor: '#fff', borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
        marginTop: 4, marginBottom: 16,
    },
    btnPrimaryText: {
        fontSize: 15, fontWeight: '700', color: '#1e3a86',
    },

    btnLink: { alignItems: 'center' },
    btnLinkText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
    btnLinkHighlight: { color: '#fff', fontWeight: '600' },
});

export default LoginScreen;