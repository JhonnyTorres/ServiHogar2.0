import { useState, useEffect, useRef } from "react";
import {
    StyleSheet, View, Text, TouchableOpacity,
    ActivityIndicator, Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Rect } from "react-native-svg";
import { sendEmailVerification, reload } from "firebase/auth";
import { auth } from "../../services/firebaseService";
import { useAuth } from "../../../navigation/AuthContext";
import colors from "../../constants/colors";

// ─── Logo casa ────────────────────────────────────────────────────────────────
const HouseLogo = () => (
    <Svg width="32" height="30" viewBox="0 0 30 28" fill="none">
        <Path
            d="M3 13L15 2L27 13V26H19V18H11V26H3V13Z"
            fill="rgba(255,255,255,0.92)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.5"
        />
        <Rect x="12" y="19" width="6" height="7" rx="1" fill="rgba(30,58,134,0.6)" />
    </Svg>
);

// ─── Pantalla ─────────────────────────────────────────────────────────────────
const EmailVerificationScreen = () => {
    const { setUser, logout } = useAuth();
    const [checking, setChecking] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const intervalRef = useRef(null);
    const checkRef = useRef(null);

    const email = auth.currentUser?.email || '';

    // ── Verificación automática cada 5 segundos ───────────────────────────────
    useEffect(() => {
        checkRef.current = setInterval(async () => {
            try {
                await reload(auth.currentUser);
                if (auth.currentUser?.emailVerified) {
                    clearInterval(checkRef.current);
                    // Forzar actualización en AuthContext
                    setUser({ ...auth.currentUser });
                }
            } catch (_) { }
        }, 5000);

        return () => {
            clearInterval(checkRef.current);
            clearInterval(intervalRef.current);
        };
    }, []);

    // ── Countdown para reenvío ────────────────────────────────────────────────
    const startCountdown = (seconds = 60) => {
        setCountdown(seconds);
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // ── Verificar manualmente ─────────────────────────────────────────────────
    const handleCheckNow = async () => {
        setChecking(true);
        try {
            // Recargar el usuario desde Firebase
            await reload(auth.currentUser);

            if (auth.currentUser?.emailVerified) {
                // Forzar que AuthContext detecte el cambio propagando
                // un nuevo objeto user con emailVerified = true
                setUser({ ...auth.currentUser });
            } else {
                Alert.alert(
                    'Correo aún no verificado',
                    'Revisa tu bandeja de entrada y haz clic en el enlace del correo antes de continuar. También revisa la carpeta de spam.'
                );
            }
        } catch (e) {
            Alert.alert('Error', 'No se pudo verificar el estado. Intenta de nuevo.');
        } finally {
            setChecking(false);
        }
    };

    // ── Reenviar correo ───────────────────────────────────────────────────────
    const handleResend = async () => {
        if (countdown > 0) return;
        setResending(true);
        try {
            await sendEmailVerification(auth.currentUser);
            startCountdown(60);
            Alert.alert(
                '✉ Correo enviado',
                `Revisa tu bandeja de entrada en ${email}.`
            );
        } catch (e) {
            if (e.code === 'auth/too-many-requests') {
                Alert.alert('Demasiados intentos', 'Espera unos minutos antes de solicitar otro correo.');
            } else {
                Alert.alert('Error', 'No se pudo reenviar el correo. Intenta más tarde.');
            }
        } finally {
            setResending(false);
        }
    };

    // ── Volver al login ───────────────────────────────────────────────────────
    const handleCancel = async () => {
        clearInterval(checkRef.current);
        clearInterval(intervalRef.current);
        await logout();
    };

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <View style={styles.inner}>

                {/* Logo */}
                <View style={styles.logoWrap}>
                    <View style={styles.logoCircle}>
                        <HouseLogo />
                    </View>
                    <Text style={styles.appName}>Verifica tu correo</Text>
                    <Text style={styles.appSub}>Un paso más para entrar a ServiHogar</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>

                    {/* Ícono sobre */}
                    <View style={styles.mailIconWrap}>
                        <Ionicons name="mail-open-outline" size={44} color="rgba(255,255,255,0.9)" />
                    </View>

                    <Text style={styles.title}>Revisa tu bandeja</Text>
                    <Text style={styles.desc}>
                        Enviamos un enlace de verificación a:
                    </Text>
                    <Text style={styles.emailText}>{email}</Text>
                    <Text style={styles.desc}>
                        Haz clic en el enlace del correo y luego regresa aquí.
                    </Text>

                    {/* Verificar manualmente */}
                    <TouchableOpacity
                        style={[styles.btnPrimary, checking && { opacity: 0.65 }]}
                        onPress={handleCheckNow}
                        disabled={checking}
                        activeOpacity={0.85}
                    >
                        {checking
                            ? <ActivityIndicator color="#1e3a86" size="small" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={18} color="#1e3a86" />
                                <Text style={styles.btnPrimaryText}>Ya verifiqué mi correo</Text>
                            </>
                        }
                    </TouchableOpacity>

                    {/* Separador */}
                    <View style={styles.separator}>
                        <View style={styles.sepLine} />
                        <Text style={styles.sepText}>¿No llegó el correo?</Text>
                        <View style={styles.sepLine} />
                    </View>

                    {/* Reenviar */}
                    <TouchableOpacity
                        style={[styles.btnSecondary, (countdown > 0 || resending) && { opacity: 0.5 }]}
                        onPress={handleResend}
                        disabled={countdown > 0 || resending}
                        activeOpacity={0.85}
                    >
                        {resending
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <>
                                <Ionicons name="refresh-outline" size={16} color="#fff" />
                                <Text style={styles.btnSecondaryText}>
                                    {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar correo'}
                                </Text>
                            </>
                        }
                    </TouchableOpacity>

                    {/* Tip */}
                    <View style={styles.tipBox}>
                        <Ionicons name="bulb-outline" size={14} color="rgba(255,255,255,0.65)" />
                        <Text style={styles.tipText}>
                            Revisa también tu carpeta de spam o correo no deseado.
                        </Text>
                    </View>

                    {/* Cancelar */}
                    <TouchableOpacity style={styles.btnCancel} onPress={handleCancel}>
                        <Ionicons name="arrow-back-outline" size={14} color="rgba(255,255,255,0.45)" />
                        <Text style={styles.btnCancelText}>Usar otra cuenta</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1, justifyContent: 'center',
        alignItems: 'center', paddingHorizontal: 24,
    },

    logoWrap: { alignItems: 'center', marginBottom: 24 },
    logoCircle: {
        width: 64, height: 64, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    appName: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
    appSub: { fontSize: 13, color: 'rgba(255,255,255,0.58)', marginTop: 4, textAlign: 'center' },

    card: {
        width: '100%', maxWidth: 400,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 22, padding: 22,
    },

    mailIconWrap: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16, padding: 16,
        alignSelf: 'center', marginBottom: 14,
    },
    title: {
        fontSize: 18, fontWeight: '700',
        color: '#fff', textAlign: 'center', marginBottom: 8,
    },
    desc: {
        fontSize: 13, color: 'rgba(255,255,255,0.6)',
        textAlign: 'center', lineHeight: 19,
    },
    emailText: {
        fontSize: 14, fontWeight: '600', color: '#fff',
        textAlign: 'center', marginVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    },

    btnPrimary: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8,
        backgroundColor: '#fff', borderRadius: 11,
        paddingVertical: 13, marginTop: 16, marginBottom: 16,
    },
    btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#1e3a86' },

    separator: {
        flexDirection: 'row', alignItems: 'center',
        gap: 8, marginBottom: 12,
    },
    sepLine: { flex: 1, height: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' },
    sepText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

    btnSecondary: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 11, paddingVertical: 12, marginBottom: 14,
    },
    btnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#fff' },

    tipBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 7,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 10, padding: 10, marginBottom: 14,
    },
    tipText: {
        flex: 1, fontSize: 12,
        color: 'rgba(255,255,255,0.6)', lineHeight: 17,
    },

    btnCancel: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 5,
    },
    btnCancelText: { fontSize: 13, color: 'rgba(255,255,255,0.45)' },
});

export default EmailVerificationScreen;