import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../navigation/AuthContext";
import { db } from "../services/firebaseService";
import colors from "../constants/colors";

const CATEGORIAS_POPULARES = [
    { emoji: '💧', label: 'Plomería' },
    { emoji: '⚡', label: 'Electricidad' },
    { emoji: '🧹', label: 'Aseo' },
    { emoji: '🚴', label: 'Domicilios' },
];

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

const SplashClientScreen = ({ onDone }) => {
    const { user } = useAuth();
    const [nombre, setNombre] = useState('');

    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, 'usuarios', user.uid)).then(snap => {
            const primerNombre = (snap.data()?.nombre || '').split(' ')[0];
            setNombre(primerNombre);
        });
    }, [user]);

    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, []);

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <IconoPulsante>
                <Ionicons name="home" size={44} color="#fff" />
            </IconoPulsante>

            <FadeUp delay={200} style={{ alignItems: 'center' }}>
                <Text style={styles.titulo}>ServiHogar</Text>
                <Text style={styles.subtitulo}>Servicios del hogar a tu alcance</Text>
            </FadeUp>

            <FadeUp delay={500} style={styles.divider} />

            <FadeUp delay={500} style={styles.card}>
                <Text style={styles.cardEmoji}>👋</Text>
                <Text style={styles.cardTitulo}>¡Bienvenido{nombre ? `, ${nombre}` : ''}!</Text>
                <Text style={styles.cardTexto}>Encuentra el profesional perfecto para tu hogar hoy</Text>
            </FadeUp>

            <FadeUp delay={800} style={styles.chipsRow}>
                {CATEGORIAS_POPULARES.map(cat => (
                    <View key={cat.label} style={styles.chip}>
                        <Text style={styles.chipTexto}>{cat.emoji} {cat.label}</Text>
                    </View>
                ))}
            </FadeUp>

            <FadeUp delay={1100} style={styles.loaderWrap}>
                <SpinnerSimple />
                <Text style={styles.loaderTexto}>Cargando tu espacio...</Text>
            </FadeUp>
        </LinearGradient>
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
        borderRadius: 16, padding: 20, width: '100%', alignItems: 'center', marginBottom: 24,
    },
    cardEmoji: { fontSize: 24, marginBottom: 10 },
    cardTitulo: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
    cardTexto: { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center', lineHeight: 19 },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 32 },
    chip: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    chipTexto: { color: '#fff', fontSize: 12 },

    loaderWrap: { alignItems: 'center', gap: 10 },
    spinner: { width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.85)' },
    loaderTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});

export default SplashClientScreen;