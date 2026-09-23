import { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, ScrollView,
    RefreshControl, SafeAreaView
} from "react-native";
import {
    collection, query, where, onSnapshot,
    doc, getDoc, updateDoc, Timestamp, orderBy, increment
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../navigation/AuthContext";
import { db } from "../services/firebaseService";
import sqliteService from "../services/sqliteService";

// ─── Categorías actualizadas ──────────────────────────────────────────────────
const LABEL_SERVICIOS = {
    plomeria: 'Plomería', electricidad: 'Electricidad', construccion: 'Construcción',
    pintura: 'Pintura', carpinteria: 'Carpintería', cerrajeria: 'Cerrajería',
    jardineria: 'Jardinería', aseo: 'Aseo', gas: 'Gas', climatizacion: 'Climatización',
    domicilios: 'Domicilios', cuidado_ninos: 'Cuidado niños',
    adultos_mayores: 'Adultos mayores', servicios_gen: 'Servicios gen.',
};

const ESTADO_CONFIG = {
    pendiente: { label: 'Pendiente', bg: '#FEF3C7', color: '#92400E' },
    en_proceso: { label: 'En proceso', bg: '#DBEAFE', color: '#1E40AF' },
    finalizado: { label: 'Finalizado', bg: '#DCFCE7', color: '#15803D' },
    rechazado: { label: 'Rechazado', bg: '#FEE2E2', color: '#B91C1C' },
};

const FILTROS = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendiente' },
    { key: 'en_proceso', label: 'En proceso' },
    { key: 'finalizado', label: 'Finalizado' },
    { key: 'rechazado', label: 'Rechazado' },
];

const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Caché de perfiles ────────────────────────────────────────────────────────
const perfilesCache = {};
const getProfesionalPerfil = async (uid) => {
    if (perfilesCache[uid]) return perfilesCache[uid];
    const snap = await getDoc(doc(db, 'usuarios', uid));
    const data = snap.exists() ? snap.data() : { nombre: 'Profesional', servicios: [] };
    perfilesCache[uid] = data;
    return data;
};

// ─── Estrellas ────────────────────────────────────────────────────────────────
const StarRating = ({ value, onChange, readonly = false }) => (
    <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => !readonly && onChange(n)} disabled={readonly}>
                <Ionicons
                    name={n <= value ? 'star' : 'star-outline'}
                    size={readonly ? 15 : 28}
                    color={n <= value ? '#F59E0B' : '#D1D5DB'}
                />
            </TouchableOpacity>
        ))}
    </View>
);

// ─── Modal calificación ───────────────────────────────────────────────────────
const RatingModal = ({ visible, servicio, onClose, onSubmit }) => {
    const [stars, setStars] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (stars === 0) {
            Alert.alert('Calificación requerida', 'Selecciona entre 1 y 5 estrellas.');
            return;
        }
        setLoading(true);
        await onSubmit(servicio.id, stars, comment.trim());
        setLoading(false);
        setStars(0);
        setComment('');
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Calificar servicio</Text>
                    <Text style={styles.modalSubtitle}>{servicio?._profesionalNombre}</Text>

                    <Text style={styles.modalLabel}>Tu calificación</Text>
                    <StarRating value={stars} onChange={setStars} />

                    <Text style={[styles.modalLabel, { marginTop: 16 }]}>Comentario (opcional)</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="¿Cómo fue tu experiencia?"
                        placeholderTextColor="#9CA3AF"
                        value={comment}
                        onChangeText={t => { if (t.length <= 300) setComment(t); }}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{comment.length} / 300</Text>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitBtn, (loading || stars === 0) && { opacity: 0.5 }]}
                            onPress={handleSubmit}
                            disabled={loading || stars === 0}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.submitBtnText}>Enviar</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── Tarjeta de servicio ──────────────────────────────────────────────────────
const ServiceCard = ({ item, onCalificar }) => {
    const estado = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.pendiente;
    const categoriaLabel = LABEL_SERVICIOS[item.categoria] || item.categoria;
    const yaCalifico = item.calificacion !== null && item.calificacion !== undefined;
    const ini = initials(item._profesionalNombre);
    const serviciosLabel = (item._profesionalServicios || [])
        .map(s => LABEL_SERVICIOS[s] || s).join(' · ');

    return (
        <View style={[styles.card, item.estado === 'rechazado' && styles.cardRechazado]}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{categoriaLabel}</Text>
                    <Text style={styles.cardDate}>{formatDate(item.creadoEn)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: estado.bg }]}>
                    <Text style={[styles.badgeText, { color: estado.color }]}>{estado.label}</Text>
                </View>
            </View>

            {/* Rechazado */}
            {item.estado === 'rechazado' && (
                <View style={styles.rechazadoInfo}>
                    <Ionicons name="information-circle-outline" size={14} color="#B91C1C" />
                    <Text style={styles.rechazadoText}>
                        El profesional no pudo tomar este servicio. Intenta con otro profesional.
                    </Text>
                </View>
            )}

            {/* Profesional */}
            <View style={styles.profesionalRow}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{ini}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.profesionalName}>{item._profesionalNombre}</Text>
                    {serviciosLabel ? (
                        <Text style={styles.profesionalServices} numberOfLines={1}>
                            {serviciosLabel}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* Calificación */}
            {item.estado === 'finalizado' && (
                <View style={styles.ratingSection}>
                    {yaCalifico ? (
                        <View>
                            <Text style={styles.ratingLabel}>Tu calificación</Text>
                            <StarRating value={item.calificacion} readonly />
                            {item.comentario ? (
                                <Text style={styles.ratingComment}>"{item.comentario}"</Text>
                            ) : null}
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.rateBtn} onPress={() => onCalificar(item)}>
                            <Ionicons name="star-outline" size={15} color="#2563EB" />
                            <Text style={styles.rateBtnText}>Calificar servicio</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────
const ClientServicesScreen = () => {
    const { user } = useAuth();
    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedServicio, setSelectedServicio] = useState(null);
    const [filtro, setFiltro] = useState('todos');

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'servicios'),
            where('clienteId', '==', user.uid),
            orderBy('creadoEn', 'desc')
        );
        const unsub = onSnapshot(q, async snap => {
            const base = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const uids = [...new Set(base.map(s => s.profesionalId).filter(Boolean))];
            await Promise.all(uids.map(uid => getProfesionalPerfil(uid)));

            const enriquecidos = base.map(s => {
                const perfil = perfilesCache[s.profesionalId] || {};
                return {
                    ...s,
                    _profesionalNombre: perfil.nombre || 'Profesional',
                    _profesionalServicios: perfil.servicios || [],
                };
            });

            setServicios(enriquecidos);

            // Guardar en SQLite
            try { sqliteService.guardarServiciosCache(enriquecidos); } catch (_) { }

            setLoading(false);
            setRefreshing(false);
        }, error => {
            console.error('Error al obtener servicios:', error);
            setLoading(false);
            setRefreshing(false);
        });
        return () => unsub();
    }, [user]);

    const handleSubmitRating = async (servicioId, stars, comment) => {
        try {
            await updateDoc(doc(db, 'servicios', servicioId), {
                calificacion: stars,
                comentario: comment,
                calificadoEn: Timestamp.now(),
            });
            const servicio = servicios.find(s => s.id === servicioId);
            if (servicio?.profesionalId) {
                await updateDoc(doc(db, 'usuarios', servicio.profesionalId), {
                    totalCalificaciones: increment(1),
                    sumaCalificaciones: increment(stars),
                });
                delete perfilesCache[servicio.profesionalId];

                // Actualizar caché local
                try { sqliteService.actualizarCalificacionCache(servicioId, stars, comment); } catch (_) { }
            }
            setModalVisible(false);
            Alert.alert('¡Gracias!', 'Tu calificación fue registrada.');
        } catch (error) {
            console.error('Error al calificar:', error);
            Alert.alert('Error', 'No se pudo enviar la calificación.');
        }
    };

    const filtrados = filtro === 'todos'
        ? servicios
        : servicios.filter(s => s.estado === filtro);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <SafeAreaView style={styles.header} edges={['top']}>
                <Text style={styles.headerTitle}>Mis servicios</Text>
                <Text style={styles.headerSub}>{servicios.length} en total</Text>
            </SafeAreaView>

            {/* Filtros */}
            <View style={styles.filtrosWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtrosContainer}
                    style={{ flexGrow: 0 }}
                >
                    {FILTROS.map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filtroChip, filtro === f.key && styles.filtroChipActive]}
                            onPress={() => setFiltro(f.key)}
                        >
                            <Text style={[styles.filtroText, filtro === f.key && styles.filtroTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Lista */}
            {filtrados.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="clipboard-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                        {filtro === 'todos'
                            ? 'Aún no tienes servicios contratados'
                            : `No tienes servicios con estado "${ESTADO_CONFIG[filtro]?.label}"`
                        }
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filtrados}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ServiceCard
                            item={item}
                            onCalificar={s => { setSelectedServicio(s); setModalVisible(true); }}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); }}
                            colors={['#2563EB']}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            <RatingModal
                visible={modalVisible}
                servicio={selectedServicio}
                onClose={() => setModalVisible(false)}
                onSubmit={handleSubmitRating}
            />
        </View>
    );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },

    header: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        paddingTop: 16, paddingBottom: 16,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

    filtrosWrapper: {
        backgroundColor: '#fff',
        borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB',
    },
    filtrosContainer: {
        paddingHorizontal: 14, paddingVertical: 10,
        gap: 8, alignItems: 'center',
    },
    filtroChip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 0.5,
        borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
        alignSelf: 'flex-start',
    },
    filtroChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    filtroText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    filtroTextActive: { color: '#fff', fontWeight: '600' },

    list: { padding: 16, gap: 10 },

    card: {
        backgroundColor: '#fff', borderRadius: 14,
        padding: 14, borderWidth: 0.5, borderColor: '#E5E7EB',
    },
    cardRechazado: { borderColor: '#FCA5A5', backgroundColor: '#FFF8F8' },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 10,
    },
    cardTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
    cardDate: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
    badgeText: { fontSize: 11, fontWeight: '500' },

    rechazadoInfo: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        backgroundColor: '#FEE2E2', borderRadius: 8,
        padding: 9, marginBottom: 10,
    },
    rechazadoText: { flex: 1, fontSize: 12, color: '#B91C1C', lineHeight: 17 },

    profesionalRow: {
        flexDirection: 'row', alignItems: 'center', gap: 9,
        backgroundColor: '#F9FAFB', borderRadius: 10, padding: 9,
    },
    avatar: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
    profesionalName: { fontSize: 13, fontWeight: '600', color: '#111' },
    profesionalServices: { fontSize: 11, color: '#6B7280', marginTop: 1 },

    ratingSection: {
        marginTop: 10, borderTopWidth: 0.5,
        borderTopColor: '#F3F4F6', paddingTop: 10,
    },
    ratingLabel: { fontSize: 12, color: '#6B7280', marginBottom: 5 },
    ratingComment: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 5 },
    rateBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#EFF6FF', padding: 9,
        borderRadius: 9, justifyContent: 'center',
    },
    rateBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: 24, paddingBottom: 36,
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 4 },
    modalSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 18 },
    modalLabel: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 8 },
    textArea: {
        borderWidth: 0.5, borderColor: '#E5E7EB', borderRadius: 10,
        padding: 12, fontSize: 14, color: '#111',
        minHeight: 80, backgroundColor: '#F9FAFB',
    },
    charCount: { fontSize: 11, color: '#9CA3AF', alignSelf: 'flex-end', marginTop: 4, marginBottom: 16 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
        flex: 1, padding: 13, borderRadius: 10,
        borderWidth: 0.5, borderColor: '#E5E7EB', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
    submitBtn: { flex: 1, padding: 13, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center' },
    submitBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});

export default ClientServicesScreen;