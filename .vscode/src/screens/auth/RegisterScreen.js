import { useState } from "react";
import {
    StyleSheet, TextInput, View, Text,
    TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";

const RegisterScreen = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const handleContinue = () => {
        if (!name || !email || !password || !confirmPassword) {
            setError('Todos los campos son obligatorios');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setError('');
        navigation.navigate('RoleSelection', { name, email, password });
    };

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.logoCircle}>
                        <Ionicons name="person-add" size={28} color="#fff" />
                    </View>
                    <Text style={styles.appName}>Crear cuenta</Text>
                    <Text style={styles.appSub}>Únete a la comunidad</Text>

                    <View style={styles.card}>
                        <View style={styles.inputWrap}>
                            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.6)" />
                            <TextInput
                                style={styles.input}
                                placeholder="Nombre completo"
                                placeholderTextColor="rgba(255,255,255,0.45)"
                                value={name}
                                onChangeText={t => { setName(t); setError(''); }}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputWrap}>
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

                        <View style={styles.inputWrap}>
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

                        <View style={styles.inputWrap}>
                            <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.6)" />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirmar contraseña"
                                placeholderTextColor="rgba(255,255,255,0.45)"
                                value={confirmPassword}
                                onChangeText={t => { setConfirmPassword(t); setError(''); }}
                                secureTextEntry={!showConfirm}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
                                <Ionicons
                                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
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
                            onPress={handleContinue}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#1e3a86" />
                                : <Text style={styles.btnPrimaryText}>Continuar →</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.btnLink}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.btnLinkText}>
                                ¿Ya tienes cuenta?{' '}
                                <Text style={styles.btnLinkHighlight}>Inicia sesión</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1 },
    scroll: {
        flexGrow: 1, justifyContent: 'center',
        alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40,
    },

    logoCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    appName: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
    appSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 28 },

    card: {
        width: '100%', maxWidth: 400,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 24, padding: 24,
    },

    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
        marginBottom: 12,
    },
    input: { flex: 1, fontSize: 14, color: '#fff' },

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
    btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#1e3a86' },

    btnLink: { alignItems: 'center' },
    btnLinkText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
    btnLinkHighlight: { color: '#fff', fontWeight: '600' },
});

export default RegisterScreen;