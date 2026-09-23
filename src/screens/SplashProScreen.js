import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../navigation/AuthContext";
import { db } from "../services/firebaseService";
import colors from "../constants/colors";

// ─── Ítem que aparece con fade + deslizamiento hacia arriba ───────────────────
const FadeUp = ({ delay, style, children }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: anim,
                    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

// ─── Ícono con anillo pulsante ─────────────────────────────────────────────────
const IconoPulsante = ({ children }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const ring = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.timing(ring, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true })
        ).start();
    }, []);

    return (
        <View style={styles.iconoWrap}>
            <Animated.View
                style={[
                    styles.ring,
                    {
                        opacity: ring.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.4, 0.1, 0] }),
                        transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
                    },
                ]}
            />
            <Animated.View style={[styles.iconoCirculo, { transform: [{ scale }] }]}>
                {children}
            </Animated.View>
        </View>
    );
};

// ─── Spinner circular simple ───────────────────────────────────────────────────
const SpinnerSimple = () => {
    const rotate = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotate, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
        ).start();
    }, []);

    const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />;
};

const SplashProScreen = ({ onDone }) => {
    const { user } = useAuth();
    const [nombre, setNombre] = useState('');
    const [metricas, setMetricas] = useState({ nuevas: 0, enProceso: 0, rating: '—' });

    useEffect(() => {
        if (!user) return;

        (async () => {
            const perfilSnap = await getDoc(doc(db, 'usuarios', user.uid));
            const perfil = perfilSnap.data() || {};
            setNombre((perfil.nombre || '').split(' ')[0]);

            const rating = perfil.totalCalificaciones > 0
                ? (perfil.sumaCalificaciones / perfil.totalCalificaciones).toFixed(1)
                : '—';

            const serviciosRef = collection(db, 'servicios');
            const [pendientesSnap, enProcesoSnap] = await Promise.all([
                getDocs(query(serviciosRef, where('profesionalId', '==', user.uid), where('estado', '==', 'pendiente'))),
                getDocs(query(serviciosRef, where('profesionalId', '==', user.uid), where('estado', '==', 'en_proceso'))),
            ]);

            setMetricas({
                nuevas: pendientesSnap.size,
                enProceso: enProcesoSnap.size,
                rating,
            });
        })();
    }, [user]);

    useEffect(() => {
        const t = setTimeout(onDone, 3200);
        return () => clearTimeout(t);
    }, []);

    return (
        <LinearGradient colors={colors.gradientePro} style={styles.container}>
            <IconoPulsante>
                <Ionicons name="construct" size={40} color="#fff" />
            </IconoPulsante>

            <FadeUp delay={200} style={{ alignItems: 'center' }}>
                <Text style={styles.titulo}>ServiHogar</Text>
                <Text style={styles.subtitulo}>Panel de profesionales</Text>
            </FadeUp>

            <FadeUp delay={500} style={styles.divider} />

            <FadeUp delay={500} style={styles.card}>
                <Text style={styles.cardEmoji}>🔧</Text>
                <Text style={styles.cardTitulo}>¡Listo para trabajar{nombre ? `, ${nombre}` : ''}!</Text>
                <Text style={styles.cardTexto}>
                    Tienes <Text style={styles.cardDestacado}>{metricas.nuevas} solicitud{metricas.nuevas !== 1 ? 'es' : ''}</Text> esperando tu respuesta
                </Text>
            </FadeUp>

            <FadeUp delay={800} style={styles.metricasRow}>
                <View style={styles.metricaCard}>
                    <Text style={[styles.metricaValor, { color: '#FCD34D' }]}>{metricas.nuevas}</Text>
                    <Text style={styles.metricaLabel}>Nuevas</Text>
                </View>
                <View style={styles.metricaCard}>
                    <Text style={[styles.metricaValor, { color: '#fff' }]}>{metricas.enProceso}</Text>
                    <Text style={styles.metricaLabel}>En proceso</Text>
                </View>
                <View style={styles.metricaCard}>
                    <Text style={[styles.metricaValor, { color: '#86EFAC' }]}>{metricas.rating}⭐</Text>
                    <Text style={styles.metricaLabel}>Rating</Text>
                </View>
            </FadeUp>

            <FadeUp delay={1100} style={styles.loaderWrap}>
                <SpinnerSimple />
                <Text style={styles.loaderTexto}>Preparando tu panel...</Text>
            </FadeUp>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },

    iconoWrap: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
    ring: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
    iconoCirculo: {
        width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
    },

    titulo: { color: '#fff', fontSize: 26, fontWeight: '700' },
    subtitulo: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6 },
    divider: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginVertical: 24 },

    card: {
        backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 20,
    },
    cardEmoji: { fontSize: 24, marginBottom: 10 },
    cardTitulo: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
    cardTexto: { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center', lineHeight: 19 },
    cardDestacado: { color: '#FCD34D', fontWeight: '700' },

    metricasRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 32 },
    metricaCard: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center',
    },
    metricaValor: { fontSize: 16, fontWeight: '700' },
    metricaLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },

    loaderWrap: { alignItems: 'center', gap: 10 },
    spinner: { width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.85)' },
    loaderTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});

export default SplashProScreen;