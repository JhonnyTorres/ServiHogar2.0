import { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator
} from "react-native";
import {
    collection, query, where, onSnapshot, doc
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../navigation/AuthContext";
import { db } from "../services/firebaseService";
import colors from "../constants/colors";
import { LinearGradient } from "expo-linear-gradient";


// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS = [
    { id: 'plomeria', label: 'Plomería', icon: 'water-outline' },
    { id: 'electricidad', label: 'Electricidad', icon: 'flash-outline' },
    { id: 'construccion', label: 'Construcción', icon: 'construct-outline' },
    { id: 'pintura', label: 'Pintura', icon: 'color-palette-outline' },
    { id: 'carpinteria', label: 'Carpintería', icon: 'hammer-outline' },
    { id: 'cerrajeria', label: 'Cerrajería', icon: 'key-outline' },
    { id: 'jardineria', label: 'Jardinería', icon: 'leaf-outline' },
    { id: 'limpieza', label: 'Limpieza', icon: 'sparkles-outline' },
    { id: 'gas', label: 'Gas', icon: 'flame-outline' },
    { id: 'climatizacion', label: 'Climatización', icon: 'snow-outline' },
];

const LABEL_SERVICIOS = {
    plomeria: 'Plomería', electricidad: 'Electricidad', construccion: 'Construcción',
    pintura: 'Pintura', carpinteria: 'Carpintería', cerrajeria: 'Cerrajería',
    jardineria: 'Jardinería', limpieza: 'Limpieza', gas: 'Gas', climatizacion: 'Climatización',
};

const ESTADO_CONFIG = {
    pendiente: { label: 'Pendiente', bg: '#FAEEDA', color: '#633806' },
    en_proceso: { label: 'En proceso', bg: '#E6F1FB', color: '#0C447C' },
    finalizado: { label: 'Finalizado', bg: '#EAF3DE', color: '#27500A' },
    rechazado: { label: 'Rechazado', bg: '#FCEBEB', color: '#A32D2D' },
};

const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ─── Home Cliente ─────────────────────────────────────────────────────────────

const HomeCliente = ({ user }) => {
    const navigation = useNavigation();
    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(true);
    const nombre = user?.displayName?.split(' ')[0] || 'Usuario';

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'servicios'),
            where('clienteId', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const enProceso = servicios.filter(s => s.estado === 'en_proceso').length;
    const finalizados = servicios.filter(s => s.estado === 'finalizado').length;
    const pendientes = servicios.filter(s => s.estado === 'pendiente').length;
    const activos = servicios.filter(s => s.estado === 'en_proceso' || s.estado === 'pendiente');

    return (
        <LinearGradient colors={colors.gradientePrimario} style={{ flex: 1 }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.headerSection}>
                    <Text style={styles.greeting}>¡Hola, {nombre}! 👋</Text>
                    <Text style={styles.greetingSub}>¿Qué necesitas hoy?</Text>
                </View>

            {loading ? (
                <ActivityIndicator color={colors.variante5} style={{ marginVertical: 16 }} />
            ) : (
                <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>En proceso</Text>
                        <Text style={[styles.metricValue, { color: '#185FA5' }]}>{enProceso}</Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Finalizados</Text>
                        <Text style={[styles.metricValue, { color: '#27500A' }]}>{finalizados}</Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Pendientes</Text>
                        <Text style={[styles.metricValue, { color: '#633806' }]}>{pendientes}</Text>
                    </View>
                </View>
            )}

            <Text style={styles.sectionTitle}>Acceso rápido</Text>
            <View style={styles.categoriasGrid}>
                {CATEGORIAS.map(c => (
                    <TouchableOpacity
                        key={c.id}
                        style={styles.categoriaChip}
                        onPress={() => navigation.navigate('Buscar')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={c.icon} size={20} color="#185FA5" />
                        <Text style={styles.categoriaLabel}>{c.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activos.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Servicios activos</Text>
                    {activos.map(s => {
                        const estado = ESTADO_CONFIG[s.estado];
                        return (
                            <TouchableOpacity
                                key={s.id}
                                style={styles.card}
                                onPress={() => navigation.navigate('MisServicios')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.cardRow}>
                                    <Text style={styles.cardTitle}>
                                        {LABEL_SERVICIOS[s.categoria] || s.categoria}
                                    </Text>
                                    <View style={[styles.badge, { backgroundColor: estado?.bg }]}>
                                        <Text style={[styles.badgeText, { color: estado?.color }]}>
                                            {estado?.label}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.cardSub}>{formatDate(s.creadoEn)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </>
            )}

            <View style={{ height: 24 }} />
            </ScrollView>
        </LinearGradient>
    );
};

// ─── Home Profesional ─────────────────────────────────────────────────────────

const HomeProfesional = ({ user, userData }) => {
    const navigation = useNavigation();
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const nombre = user?.displayName?.split(' ')[0] || 'Profesional';

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'servicios'),
            where('profesionalId', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const nuevas = solicitudes.filter(s => s.estado === 'pendiente').length;
    const enProceso = solicitudes.filter(s => s.estado === 'en_proceso').length;
    const finalizados = solicitudes.filter(s => s.estado === 'finalizado').length;

    const promedio = userData?.totalCalificaciones > 0
        ? (userData.sumaCalificaciones / userData.totalCalificaciones).toFixed(1)
        : null;

    const reciente = solicitudes
        .filter(s => s.estado === 'pendiente')
        .sort((a, b) => (b.creadoEn?.toDate?.() || 0) - (a.creadoEn?.toDate?.() || 0))[0];

    return (
        <LinearGradient colors={colors.gradientePrimario} style={{ flex: 1 }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.headerSection}>
                    <Text style={styles.greeting}>¡Hola, {nombre}! 👋</Text>
                    <Text style={styles.greetingSub}>Aquí está tu resumen de hoy</Text>
                </View>

            {loading ? (
                <ActivityIndicator color={colors.variante5} style={{ marginVertical: 16 }} />
            ) : (
                <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Nuevas</Text>
                        <Text style={[styles.metricValue, { color: '#633806' }]}>{nuevas}</Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>En proceso</Text>
                        <Text style={[styles.metricValue, { color: '#185FA5' }]}>{enProceso}</Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Finalizados</Text>
                        <Text style={[styles.metricValue, { color: '#27500A' }]}>{finalizados}</Text>
                    </View>
                </View>
            )}

            <Text style={styles.sectionTitle}>Estado de tu perfil</Text>
            <View style={styles.card}>
                <View style={styles.perfilRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(user?.displayName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.perfilNombre}>{user?.displayName}</Text>
                        {promedio ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                {[1, 2, 3, 4, 5].map(n => (
                                    <Ionicons
                                        key={n}
                                        name={n <= Math.round(Number(promedio)) ? 'star' : 'star-outline'}
                                        size={13}
                                        color={n <= Math.round(Number(promedio)) ? '#EF9F27' : '#ccc'}
                                    />
                                ))}
                                <Text style={styles.perfilRating}>
                                    {promedio} ({userData.totalCalificaciones} reseñas)
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.perfilRating}>Sin calificaciones aún</Text>
                        )}
                    </View>
                </View>

                {userData?.servicios?.length > 0 && (
                    <View style={styles.badgesRow}>
                        {userData.servicios.map(s => (
                            <View key={s} style={styles.badge}>
                                <Text style={styles.badgeText}>{LABEL_SERVICIOS[s] || s}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {userData?.descripcion ? (
                    <Text style={styles.descripcion} numberOfLines={2}>
                        {userData.descripcion}
                    </Text>
                ) : null}
            </View>

            {reciente && (
                <>
                    <Text style={styles.sectionTitle}>Solicitud reciente</Text>
                    <TouchableOpacity
                        style={[styles.card, styles.cardPendiente]}
                        onPress={() => navigation.navigate('MisSolicitudes')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.cardRow}>
                            <Text style={styles.cardTitle}>
                                {LABEL_SERVICIOS[reciente.categoria] || reciente.categoria}
                            </Text>
                            <View style={[styles.badge, { backgroundColor: '#FAEEDA' }]}>
                                <Text style={[styles.badgeText, { color: '#633806' }]}>Pendiente</Text>
                            </View>
                        </View>
                        <Text style={styles.cardSub}>{formatDate(reciente.creadoEn)}</Text>
                        <Text style={styles.verDetalle}>Toca para ver y responder →</Text>
                    </TouchableOpacity>
                </>
            )}

            <View style={{ height: 24 }} />
            </ScrollView>
        </LinearGradient>
    );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

const HomeScreen = () => {
    const { user, rol } = useAuth();
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, 'usuarios', user.uid), (s) => {
            if (s.exists()) setUserData(s.data());
        });
        return () => unsub();
    }, [user]);

    if (!rol) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.variante5} />
            </View>
        );
    }

    if (rol === 'cliente') {
        return <HomeCliente user={user} />;
    }

    return <HomeProfesional user={user} userData={userData} />;
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerSection: {
        backgroundColor: 'rgba(255,255,255,0.10)', padding: 20,
        paddingTop: 24, borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.18)', marginBottom: 16,
    },
    greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    greetingSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

    metricsRow: {
        flexDirection: 'row', gap: 10,
        paddingHorizontal: 16, marginBottom: 20,
    },
    metric: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12, padding: 12,
        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)',
    },
    metricLabel: { fontSize: 12, color: '#666' },
    metricValue: { fontSize: 26, fontWeight: '700', marginTop: 4 },

    sectionTitle: {
        fontSize: 15, fontWeight: '600', color: '#fff',
        paddingHorizontal: 16, marginBottom: 10,
    },

    categoriasGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 12, gap: 8, marginBottom: 20,
    },
    categoriaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12,
        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: 14, paddingVertical: 10,
        width: '47%',
    },
    categoriaLabel: { fontSize: 13, color: '#111' },

    card: {
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
        padding: 16, marginHorizontal: 16,
        marginBottom: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)',
    },
    cardPendiente: { borderColor: '#FAC775' },
    cardRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 6,
    },
    cardTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
    cardSub: { fontSize: 12, color: '#888' },
    verDetalle: { fontSize: 13, color: '#185FA5', marginTop: 8, fontWeight: '500' },

    badge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 12, backgroundColor: '#E6F1FB',
    },
    badgeText: { fontSize: 11, fontWeight: '600', color: '#0C447C' },
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },

    perfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    avatar: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: '#B5D4F4', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 16, fontWeight: '600', color: '#0C447C' },
    perfilNombre: { fontSize: 15, fontWeight: '600', color: '#111' },
    perfilRating: { fontSize: 12, color: '#888', marginTop: 2 },
    descripcion: { fontSize: 13, color: '#666', marginTop: 10, lineHeight: 19 },
});

export default HomeScreen;
