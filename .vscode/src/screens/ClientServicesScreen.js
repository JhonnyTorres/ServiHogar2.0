import { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, ScrollView, RefreshControl
} from "react-native";
import {
    collection, query, where, onSnapshot,
    doc, getDoc, updateDoc, Timestamp, orderBy, increment
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../navigation/AuthContext";
import { db } from "../services/firebaseService";
import colors from "../constants/colors";
import { LinearGradient } from "expo-linear-gradient";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ESTADO_CONFIG = {
    pendiente: { label: 'Pendiente', bg: '#FAEEDA', color: '#633806' },
    en_proceso: { label: 'En proceso', bg: '#E6F1FB', color: '#0C447C' },
    finalizado: { label: 'Finalizado', bg: '#EAF3DE', color: '#27500A' },
    rechazado: { label: 'Rechazado', bg: '#FCEBEB', color: '#A32D2D' },
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

// ─── Caché de perfiles ────────────────────────────────────────────────────────

const perfilesCache = {};

const getProfesionalPerfil = async (uid) => {
    if (perfilesCache[uid]) return perfilesCache[uid];
    const snap = await getDoc(doc(db, 'usuarios', uid));
    const data = snap.exists() ? snap.data() : { nombre: 'Profesional', servicios: [] };
    perfilesCache[uid] = data;
    return data;
};

// ─── Componente estrellas ─────────────────────────────────────────────────────

const StarRating = ({ value, onChange, readonly = false }) => (
    <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => !readonly && onChange(n)} disabled={readonly}>
                <Ionicons
                    name={n <= value ? 'star' : 'star-outline'}
                    size={readonly ? 16 : 28}
                    color={n <= value ? '#EF9F27' : '#ccc'}
                />
            </TouchableOpacity>
        ))}
    </View>
);

// ─── Modal de calificación ────────────────────────────────────────────────────

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
                    <Text style={styles.modalTitle}>Calificar servicio</Text>
                    <Text style={styles.modalSubtitle}>{servicio?._profesionalNombre}</Text>

                    <Text style={styles.modalLabel}>Tu calificación</Text>
                    <StarRating value={stars} onChange={setStars} />

                    <Text style={[styles.modalLabel, { marginTop: 16 }]}>Comentario (opcional)</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="¿Cómo fue tu experiencia?"
                        placeholderTextColor="#999"
                        value={comment}
                        onChangeText={(t) => { if (t.length <= 300) setComment(t); }}
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
                            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={loading}
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
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{categoriaLabel}</Text>
                    <Text style={styles.cardDate}>{formatDate(item.creadoEn)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: estado.bg }]}>
                    <Text style={[styles.badgeText, { color: estado.color }]}>{estado.label}</Text>
                </View>
            </View>

            {/* Mensaje si fue rechazado */}
            {item.estado === 'rechazado' && (
                <View style={styles.rechazadoInfo}>
                    <Ionicons name="information-circle-outline" size={15} color="#A32D2D" />
                    <Text style={styles.rechazadoText}>
                        El profesional no pudo tomar este servicio. Intenta con otro profesional.
                    </Text>
                </View>
            )}

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
                            <Ionicons name="star-outline" size={16} color="#0C447C" />
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
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedServicio, setSelectedServicio] = useState(null);
    const [filtro, setFiltro] = useState('todos');

    useEffect(() => {
        if (!user) return;

        // onSnapshot para escuchar cambios en tiempo real
        const q = query(
            collection(db, 'servicios'),
            where('clienteId', '==', user.uid),
            orderBy('creadoEn', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snap) => {
            const base = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const uidsUnicos = [...new Set(base.map(s => s.profesionalId).filter(Boolean))];
            await Promise.all(uidsUnicos.map(uid => getProfesionalPerfil(uid)));

            const enriquecidos = base.map(s => {
                const perfil = perfilesCache[s.profesionalId] || {};
                return {
                    ...s,
                    _profesionalNombre: perfil.nombre || 'Profesional',
                    _profesionalServicios: perfil.servicios || [],
                };
            });

            setServicios(enriquecidos);
            setLoading(false);
        }, (error) => {
            console.error('Error al obtener servicios:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCalificar = (servicio) => {
        setSelectedServicio(servicio);
        setModalVisible(true);
    };

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
            }

            setModalVisible(false);
            Alert.alert('¡Gracias!', 'Tu calificación fue enviada.');
        } catch (error) {
            console.error('Error al calificar:', error);
            Alert.alert('Error', 'No se pudo enviar la calificación.');
        }
    };

    const FILTROS = [
        { key: 'todos', label: 'Todos' },
        { key: 'pendiente', label: 'Pendiente' },
        { key: 'en_proceso', label: 'En proceso' },
        { key: 'finalizado', label: 'Finalizado' },
        { key: 'rechazado', label: 'Rechazado' },
    ];

    const filtrados = filtro === 'todos'
        ? servicios
        : servicios.filter(s => s.estado === filtro);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.variante5} />
            </View>
        );
    }

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mis servicios</Text>
                <Text style={styles.headerSub}>{servicios.length} en total</Text>
            </View>

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

            {filtrados.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="clipboard-outline" size={48} color="#ccc" />
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
                        <ServiceCard item={item} onCalificar={handleCalificar} />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <RatingModal
                visible={modalVisible}
                servicio={selectedServicio}
                onClose={() => setModalVisible(false)}
                onSubmit={handleSubmitRating}
            />
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
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

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
    cardRechazado: { borderColor: '#F09595', backgroundColor: '#fff8f8' },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 12,
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
    cardDate: { fontSize: 12, color: '#888', marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 11, fontWeight: '600' },

    rechazadoInfo: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        backgroundColor: '#FCEBEB', borderRadius: 8,
        padding: 10, marginBottom: 10,
    },
    rechazadoText: { flex: 1, fontSize: 12, color: '#A32D2D', lineHeight: 17 },

    profesionalRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#f8f8f8', borderRadius: 10, padding: 10,
    },
    avatar: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#B5D4F4', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontWeight: '600', color: '#0C447C' },
    profesionalName: { fontSize: 14, fontWeight: '600', color: '#111' },
    profesionalServices: { fontSize: 12, color: '#888', marginTop: 1 },

    ratingSection: {
        marginTop: 12, borderTopWidth: 0.5,
        borderTopColor: '#eee', paddingTop: 12,
    },
    ratingLabel: { fontSize: 13, color: '#666', marginBottom: 6 },
    ratingComment: { fontSize: 13, color: '#555', fontStyle: 'italic', marginTop: 6 },
    rateBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#E6F1FB', padding: 10, borderRadius: 10, justifyContent: 'center',
    },
    rateBtnText: { fontSize: 14, color: '#0C447C', fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: '#fff', borderTopLeftRadius: 20,
        borderTopRightRadius: 20, padding: 24, paddingBottom: 36,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 4 },
    modalSubtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
    modalLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
    textArea: {
        borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10,
        padding: 12, fontSize: 14, color: '#111',
        minHeight: 80, backgroundColor: '#fafafa',
    },
    charCount: { fontSize: 12, color: '#aaa', alignSelf: 'flex-end', marginTop: 4, marginBottom: 16 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
        flex: 1, padding: 13, borderRadius: 10,
        borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, color: '#666', fontWeight: '600' },
    submitBtn: { flex: 1, padding: 13, borderRadius: 10, backgroundColor: '#185FA5', alignItems: 'center' },
    submitBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});

export default ClientServicesScreen;