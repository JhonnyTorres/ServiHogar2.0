import { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, SafeAreaView
} from "react-native";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../navigation/AuthContext";
import { db } from "../services/firebaseService";

// ─── Categorías actualizadas ──────────────────────────────────────────────────
const CATEGORIAS = [
    { id: 'plomeria', label: 'Plomería', icon: 'water-outline' },
    { id: 'electricidad', label: 'Electricidad', icon: 'flash-outline' },
    { id: 'construccion', label: 'Construcción', icon: 'construct-outline' },
    { id: 'pintura', label: 'Pintura', icon: 'color-palette-outline' },
    { id: 'carpinteria', label: 'Carpintería', icon: 'hammer-outline' },
    { id: 'cerrajeria', label: 'Cerrajería', icon: 'key-outline' },
    { id: 'jardineria', label: 'Jardinería', icon: 'leaf-outline' },
    { id: 'aseo', label: 'Aseo', icon: 'sparkles-outline' },
    { id: 'gas', label: 'Gas', icon: 'flame-outline' },
    { id: 'climatizacion', label: 'Climatización', icon: 'snow-outline' },
    { id: 'domicilios', label: 'Domicilios', icon: 'bicycle-outline' },
    { id: 'cuidado_ninos', label: 'Cuidado niños', icon: 'happy-outline' },
    { id: 'adultos_mayores', label: 'Adultos mayores', icon: 'accessibility-outline' },
    { id: 'servicios_gen', label: 'Servicios gen.', icon: 'briefcase-outline' },
];

const LABEL_SERVICIOS = Object.fromEntries(CATEGORIAS.map(c => [c.id, c.label]));

const ESTADO_CONFIG = {
    pendiente: { label: 'Pendiente', bg: '#FEF3C7', color: '#92400E' },
    en_proceso: { label: 'En proceso', bg: '#DBEAFE', color: '#1E40AF' },
    finalizado: { label: 'Finalizado', bg: '#DCFCE7', color: '#15803D' },
    rechazado: { label: 'Rechazado', bg: '#FEE2E2', color: '#B91C1C' },
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
        const unsub = onSnapshot(q, snap => {
            setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const enProceso = servicios.filter(s => s.estado === 'en_proceso').length;
    const finalizados = servicios.filter(s => s.estado === 'finalizado').length;
    const pendientes = servicios.filter(s => s.estado === 'pendiente').length;
    const activos = servicios.filter(s => ['en_proceso', 'pendiente'].includes(s.estado));

    return (
        <View style={styles.container}>
            {/* Header azul */}
            <SafeAreaView style={styles.header} edges={['top']}>
                <Text style={styles.greeting}>¡Hola, {nombre}! 👋</Text>
                <Text style={styles.greetingSub}>¿Qué necesitas hoy?</Text>
            </SafeAreaView>

            <ScrollView
                style={styles.scrollBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
            >
                {/* Métricas */}
                {loading ? (
                    <ActivityIndicator color="#2563EB" style={{ marginVertical: 16 }} />
                ) : (
                    <View style={styles.metricsRow}>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>En proceso</Text>
                            <Text style={[styles.metricValue, { color: '#2563EB' }]}>{enProceso}</Text>
                        </View>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Finalizados</Text>
                            <Text style={[styles.metricValue, { color: '#16A34A' }]}>{finalizados}</Text>
                        </View>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Pendientes</Text>
                            <Text style={[styles.metricValue, { color: '#D97706' }]}>{pendientes}</Text>
                        </View>
                    </View>
                )}

                {/* Acceso rápido */}
                <Text style={styles.sectionTitle}>Acceso rápido</Text>
                <View style={styles.categoriasGrid}>
                    {CATEGORIAS.map(c => (
                        <TouchableOpacity
                            key={c.id}
                            style={styles.categoriaChip}
                            onPress={() => navigation.navigate('Buscar')}
                            activeOpacity={0.75}
                        >
                            <Ionicons name={c.icon} size={16} color="#2563EB" />
                            <Text style={styles.categoriaLabel}>{c.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Servicios activos */}
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
            </ScrollView>
        </View>
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
        const unsub = onSnapshot(q, snap => {
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
        <View style={styles.container}>
            <SafeAreaView style={styles.header} edges={['top']}>
                <Text style={styles.greeting}>¡Hola, {nombre}! 👋</Text>
                <Text style={styles.greetingSub}>Aquí está tu resumen de hoy</Text>
            </SafeAreaView>

            <ScrollView
                style={styles.scrollBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
            >
                {loading ? (
                    <ActivityIndicator color="#2563EB" style={{ marginVertical: 16 }} />
                ) : (
                    <View style={styles.metricsRow}>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Nuevas</Text>
                            <Text style={[styles.metricValue, { color: '#D97706' }]}>{nuevas}</Text>
                        </View>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>En proceso</Text>
                            <Text style={[styles.metricValue, { color: '#2563EB' }]}>{enProceso}</Text>
                        </View>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Finalizados</Text>
                            <Text style={[styles.metricValue, { color: '#16A34A' }]}>{finalizados}</Text>
                        </View>
                    </View>
                )}

                {/* Perfil */}
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
                                            size={12}
                                            color={n <= Math.round(Number(promedio)) ? '#F59E0B' : '#D1D5DB'}
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
                </View>

                {/* Solicitud reciente */}
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
                                <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                                    <Text style={[styles.badgeText, { color: '#92400E' }]}>Pendiente</Text>
                                </View>
                            </View>
                            <Text style={styles.cardSub}>{formatDate(reciente.creadoEn)}</Text>
                            <Text style={styles.verDetalle}>Toca para ver y responder →</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────
const HomeScreen = () => {
    const { user, rol } = useAuth();
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, 'usuarios', user.uid), s => {
            if (s.exists()) setUserData(s.data());
        });
        return () => unsub();
    }, [user]);

    if (!rol) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (rol === 'cliente') return <HomeCliente user={user} />;
    return <HomeProfesional user={user} userData={userData} />;
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
    },
    greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
    greetingSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

    scrollBody: { flex: 1 },

    metricsRow: {
        flexDirection: 'row', gap: 10,
        padding: 16, paddingBottom: 4,
    },
    metric: {
        flex: 1, backgroundColor: '#fff',
        borderRadius: 12, padding: 12,
        borderWidth: 0.5, borderColor: '#E5E7EB',
    },
    metricLabel: { fontSize: 11, color: '#6B7280' },
    metricValue: { fontSize: 24, fontWeight: '700', marginTop: 4 },

    sectionTitle: {
        fontSize: 14, fontWeight: '600', color: '#111',
        paddingHorizontal: 16, marginTop: 16, marginBottom: 10,
    },

    categoriasGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 12, gap: 8,
    },
    categoriaChip: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 7,
        backgroundColor: '#fff',
        borderRadius: 10, borderWidth: 0.5, borderColor: '#E5E7EB',
        paddingHorizontal: 12, paddingVertical: 10,
        width: '47%',
    },
    categoriaLabel: { fontSize: 12, color: '#111', fontWeight: '500' },

    card: {
        backgroundColor: '#fff', borderRadius: 12,
        padding: 14, marginHorizontal: 16,
        marginBottom: 10, borderWidth: 0.5, borderColor: '#E5E7EB',
    },
    cardPendiente: { borderColor: '#FCD34D' },
    cardRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 5,
    },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
    cardSub: { fontSize: 11, color: '#6B7280' },
    verDetalle: { fontSize: 12, color: '#2563EB', marginTop: 8, fontWeight: '500' },

    badge: {
        paddingHorizontal: 9, paddingVertical: 3,
        borderRadius: 20, backgroundColor: '#EFF6FF',
    },
    badgeText: { fontSize: 11, fontWeight: '500', color: '#2563EB' },
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },

    perfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontWeight: '700', color: '#1E40AF' },
    perfilNombre: { fontSize: 14, fontWeight: '600', color: '#111' },
    perfilRating: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});

export default HomeScreen;