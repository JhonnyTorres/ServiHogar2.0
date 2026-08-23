import { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView
} from "react-native";
import {
    collection, query, where, onSnapshot,
    doc, updateDoc, getDoc
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../navigation/AuthContext";
import { db } from "../services/firebaseService";
import colors from "../constants/colors";
import { LinearGradient } from "expo-linear-gradient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_CONFIG = {
    pendiente: { label: 'Pendiente', bg: '#FAEEDA', color: '#633806', icon: 'time-outline' },
    en_proceso: { label: 'En proceso', bg: '#E6F1FB', color: '#0C447C', icon: 'construct-outline' },
    finalizado: { label: 'Finalizado', bg: '#EAF3DE', color: '#27500A', icon: 'checkmark-circle-outline' },
    rechazado: { label: 'Rechazado', bg: '#FCEBEB', color: '#A32D2D', icon: 'close-circle-outline' },
};

const LABEL_SERVICIOS = {
    plomeria: 'Plomería', electricidad: 'Electricidad', construccion: 'Construcción',
    pintura: 'Pintura', carpinteria: 'Carpintería', cerrajeria: 'Cerrajería',
    jardineria: 'Jardinería', limpieza: 'Limpieza', gas: 'Gas', climatizacion: 'Climatización',
};

const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Caché de clientes ────────────────────────────────────────────────────────

const clientesCache = {};

const getClientePerfil = async (uid) => {
    if (clientesCache[uid]) return clientesCache[uid];
    const snap = await getDoc(doc(db, 'usuarios', uid));
    const data = snap.exists() ? snap.data() : { nombre: 'Cliente' };
    clientesCache[uid] = data;
    return data;
};

// ─── Tarjeta de solicitud ─────────────────────────────────────────────────────

const SolicitudCard = ({ item, onAceptar, onRechazar, onFinalizar, loadingId }) => {
    const estado = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.pendiente;
    const categoriaLabel = LABEL_SERVICIOS[item.categoria] || item.categoria;
    const ini = initials(item._clienteNombre);
    const isLoading = loadingId === item.id;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{categoriaLabel}</Text>
                    <Text style={styles.cardDate}>{formatDate(item.creadoEn)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: estado.bg }]}>
                    <Ionicons name={estado.icon} size={12} color={estado.color} />
                    <Text style={[styles.badgeText, { color: estado.color }]}> {estado.label}</Text>
                </View>
            </View>

            {/* Info cliente */}
            <View style={styles.clienteRow}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{ini}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.clienteNombre}>{item._clienteNombre}</Text>
                    <Text style={styles.clienteEmail}>{item._clienteEmail}</Text>
                </View>
            </View>

            {/* Calificación recibida si está finalizado */}
            {item.estado === 'finalizado' && item.calificacion && (
                <View style={styles.calificacionRow}>
                    <Text style={styles.calLabel}>Calificación recibida:</Text>
                    <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                            <Ionicons
                                key={n}
                                name={n <= item.calificacion ? 'star' : 'star-outline'}
                                size={16}
                                color={n <= item.calificacion ? '#EF9F27' : '#ccc'}
                            />
                        ))}
                    </View>
                    {item.comentario ? (
                        <Text style={styles.calComentario}>"{item.comentario}"</Text>
                    ) : null}
                </View>
            )}

            {/* Acciones según estado */}
            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 12 }} color={colors.variante5} />
            ) : (
                <>
                    {item.estado === 'pendiente' && (
                        <View style={styles.botonesRow}>
                            <TouchableOpacity
                                style={styles.btnRechazar}
                                onPress={() => onRechazar(item.id)}
                            >
                                <Ionicons name="close-outline" size={18} color="#A32D2D" />
                                <Text style={styles.btnRechazarText}>Rechazar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.btnAceptar}
                                onPress={() => onAceptar(item.id)}
                            >
                                <Ionicons name="checkmark-outline" size={18} color="#fff" />
                                <Text style={styles.btnAceptarText}>Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {item.estado === 'en_proceso' && (
                        <TouchableOpacity
                            style={styles.btnFinalizar}
                            onPress={() => onFinalizar(item.id)}
                        >
                            <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                            <Text style={styles.btnFinalizarText}>Marcar como finalizado</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </View>
    );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

const ProfessionalServicesScreen = () => {
    const { user } = useAuth();
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingId, setLoadingId] = useState(null);
    const [filtro, setFiltro] = useState('pendiente');

    useEffect(() => {
        if (!user) return;

        // onSnapshot escucha cambios en tiempo real
        const q = query(
            collection(db, 'servicios'),
            where('profesionalId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snap) => {
            const base = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Obtener perfiles de clientes únicos
            const uidsUnicos = [...new Set(base.map(s => s.clienteId).filter(Boolean))];
            await Promise.all(uidsUnicos.map(uid => getClientePerfil(uid)));

            // Enriquecer con datos del cliente
            const enriquecidos = base.map(s => {
                const perfil = clientesCache[s.clienteId] || {};
                return {
                    ...s,
                    _clienteNombre: perfil.nombre || 'Cliente',
                    _clienteEmail: perfil.email || '',
                };
            });

            // Ordenar: pendiente primero, luego en_proceso, finalizado, rechazado
            const orden = { pendiente: 0, en_proceso: 1, finalizado: 2, rechazado: 3 };
            enriquecidos.sort((a, b) => {
                if (orden[a.estado] !== orden[b.estado]) return orden[a.estado] - orden[b.estado];
                const ta = a.creadoEn?.toDate?.() || 0;
                const tb = b.creadoEn?.toDate?.() || 0;
                return tb - ta;
            });

            setSolicitudes(enriquecidos);
            setLoading(false);
        }, (error) => {
            console.error('Error al escuchar solicitudes:', error);
            setLoading(false);
        });

        // Limpiar listener al desmontar
        return () => unsubscribe();
    }, [user]);

    const cambiarEstado = async (servicioId, nuevoEstado) => {
        setLoadingId(servicioId);
        try {
            await updateDoc(doc(db, 'servicios', servicioId), {
                estado: nuevoEstado,
            });
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            Alert.alert('Error', 'No se pudo actualizar el estado del servicio.');
        } finally {
            setLoadingId(null);
        }
    };

    const handleAceptar = (id) => {
        Alert.alert(
            'Aceptar solicitud',
            '¿Confirmas que aceptas este servicio?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Aceptar', onPress: () => cambiarEstado(id, 'en_proceso') },
            ]
        );
    };

    const handleRechazar = (id) => {
        Alert.alert(
            'Rechazar solicitud',
            '¿Seguro que quieres rechazar este servicio?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Rechazar', style: 'destructive', onPress: () => cambiarEstado(id, 'rechazado') },
            ]
        );
    };

    const handleFinalizar = (id) => {
        Alert.alert(
            'Finalizar servicio',
            '¿Confirmas que el servicio ha sido completado?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Finalizar', onPress: () => cambiarEstado(id, 'finalizado') },
            ]
        );
    };

    const FILTROS = [
        { key: 'pendiente', label: 'Pendientes' },
        { key: 'en_proceso', label: 'En proceso' },
        { key: 'finalizado', label: 'Finalizados' },
        { key: 'rechazado', label: 'Rechazados' },
    ];

    const filtrados = solicitudes.filter(s => s.estado === filtro);
    const pendientesCount = solicitudes.filter(s => s.estado === 'pendiente').length;

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.variante5} />
            </View>
        );
    }

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            {/* Encabezado */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Mis solicitudes</Text>
                    <Text style={styles.headerSub}>{solicitudes.length} en total</Text>
                </View>
                {pendientesCount > 0 && (
                    <View style={styles.badgePendientes}>
                        <Text style={styles.badgePendientesText}>
                            {pendientesCount} nueva{pendientesCount > 1 ? 's' : ''}
                        </Text>
                    </View>
                )}
            </View>

            {/* Filtros */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtrosContainer}
            >
                {FILTROS.map(f => {
                    const count = solicitudes.filter(s => s.estado === f.key).length;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filtroChip, filtro === f.key && styles.filtroChipActive]}
                            onPress={() => setFiltro(f.key)}
                        >
                            <Text style={[styles.filtroText, filtro === f.key && styles.filtroTextActive]}>
                                {f.label} {count > 0 ? `(${count})` : ''}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Lista */}
            {filtrados.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="clipboard-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>
                        No tienes solicitudes {FILTROS.find(f => f.key === filtro)?.label.toLowerCase()}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filtrados}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <SolicitudCard
                            item={item}
                            onAceptar={handleAceptar}
                            onRechazar={handleRechazar}
                            onFinalizar={handleFinalizar}
                            loadingId={loadingId}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </LinearGradient>
    );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
    emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingHorizontal: 32 },

    header: {
        backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 20,
        paddingTop: 20, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.18)',
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    badgePendientes: {
        backgroundColor: '#E24B4A', paddingHorizontal: 12,
        paddingVertical: 6, borderRadius: 20,
    },
    badgePendientesText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    filtrosContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    filtroChip: {
        paddingHorizontal: 16, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.08)',
    },
    filtroChipActive: { backgroundColor: '#fff', borderColor: '#fff' },
    filtroText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    filtroTextActive: { color: '#1e3a86', fontWeight: '600' },

    list: { padding: 0, gap: 0, paddingBottom: 24 },

    card: {
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
        padding: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)', marginHorizontal: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 12,
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
    cardDate: { fontSize: 12, color: '#888', marginTop: 2 },
    badge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    badgeText: { fontSize: 11, fontWeight: '600' },

    clienteRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#f8f8f8', borderRadius: 10, padding: 10,
    },
    avatar: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#9FE1CB', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontWeight: '600', color: '#085041' },
    clienteNombre: { fontSize: 14, fontWeight: '600', color: '#111' },
    clienteEmail: { fontSize: 12, color: '#888', marginTop: 1 },

    calificacionRow: {
        marginTop: 12, borderTopWidth: 0.5,
        borderTopColor: '#eee', paddingTop: 10,
    },
    calLabel: { fontSize: 13, color: '#666' },
    calComentario: { fontSize: 13, color: '#555', fontStyle: 'italic', marginTop: 6 },

    botonesRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    btnRechazar: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        padding: 10, borderRadius: 10,
        borderWidth: 1, borderColor: '#F09595',
        backgroundColor: '#FCEBEB',
    },
    btnRechazarText: { fontSize: 14, color: '#A32D2D', fontWeight: '600' },
    btnAceptar: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        padding: 10, borderRadius: 10,
        backgroundColor: '#185FA5',
    },
    btnAceptarText: { fontSize: 14, color: '#fff', fontWeight: '600' },
    btnFinalizar: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        marginTop: 12, padding: 11, borderRadius: 10,
        backgroundColor: '#3B6D11',
    },
    btnFinalizarText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});

export default ProfessionalServicesScreen;