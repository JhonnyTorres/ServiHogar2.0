import { useState, useCallback } from "react";
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView, Modal, SafeAreaView
} from "react-native";
import {
    collection, query, where, getDocs,
    addDoc, serverTimestamp
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../navigation/AuthContext";
import { db } from "../services/firebaseService";
import sqliteService from "../services/sqliteService";

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

const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ─── Estrellas ────────────────────────────────────────────────────────────────
const Stars = ({ value = 0, count = 0 }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(n => (
            <Ionicons
                key={n}
                name={n <= Math.round(value) ? 'star' : 'star-outline'}
                size={12}
                color={n <= Math.round(value) ? '#F59E0B' : '#D1D5DB'}
            />
        ))}
        <Text style={styles.ratingText}>
            {count > 0 ? `${value.toFixed(1)} (${count})` : 'Sin calificaciones'}
        </Text>
    </View>
);

// ─── Modal de confirmación ────────────────────────────────────────────────────
const ConfirmModal = ({ visible, profesional, categoria, onConfirm, onCancel, loading }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Confirmar solicitud</Text>
                <Text style={styles.modalSubtitle}>
                    ¿Quieres solicitar{' '}
                    <Text style={{ fontWeight: '700', color: '#111' }}>
                        {LABEL_SERVICIOS[categoria]}
                    </Text>{' '}
                    a <Text style={{ fontWeight: '700', color: '#111' }}>{profesional?.nombre}</Text>?
                </Text>
                <View style={styles.modalInfoBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
                    <Text style={styles.modalInfoText}>
                        El profesional recibirá tu solicitud y podrá aceptarla o rechazarla.
                    </Text>
                </View>
                <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.confirmBtn, loading && { opacity: 0.6 }]}
                        onPress={onConfirm}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.confirmBtnText}>Confirmar</Text>
                        }
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

// ─── Tarjeta de profesional ───────────────────────────────────────────────────
const ProfessionalCard = ({ item, onSolicitar }) => {
    const ini = initials(item.nombre);
    const promedio = item.totalCalificaciones > 0
        ? Math.round((item.sumaCalificaciones / item.totalCalificaciones) * 10) / 10
        : 0;
    const serviciosLabel = (item.servicios || []).map(s => LABEL_SERVICIOS[s] || s);

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{ini}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.profesionalName}>{item.nombre}</Text>
                    <Stars value={promedio} count={item.totalCalificaciones || 0} />
                </View>
            </View>
            <View style={styles.badgesRow}>
                {serviciosLabel.map(s => (
                    <View key={s} style={styles.badge}>
                        <Text style={styles.badgeText}>{s}</Text>
                    </View>
                ))}
            </View>
            <TouchableOpacity
                style={styles.solicitarBtn}
                onPress={() => onSolicitar(item)}
                activeOpacity={0.85}
            >
                <Ionicons name="paper-plane-outline" size={15} color="#fff" />
                <Text style={styles.solicitarBtnText}>Solicitar servicio</Text>
            </TouchableOpacity>
        </View>
    );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────
const SearchProfessionalsScreen = () => {
    const { user } = useAuth();
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    const [profesionales, setProfesionales] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingRequest, setLoadingRequest] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProfesional, setSelectedProfesional] = useState(null);

    const buscarProfesionales = useCallback(async (categoriaId, categoriaLabel) => {
        setLoadingSearch(true);
        setProfesionales([]);
        try {
            const q = query(
                collection(db, 'usuarios'),
                where('rol', '==', 'profesional'),
                where('servicios', 'array-contains', categoriaId)
            );
            const snap = await getDocs(q);
            const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            lista.sort((a, b) => {
                const pA = a.totalCalificaciones > 0 ? a.sumaCalificaciones / a.totalCalificaciones : 0;
                const pB = b.totalCalificaciones > 0 ? b.sumaCalificaciones / b.totalCalificaciones : 0;
                return pB - pA;
            });

            setProfesionales(lista);

            // Guardar búsqueda en SQLite
            try { sqliteService.guardarBusqueda(categoriaId, categoriaLabel); } catch (_) { }
        } catch (error) {
            console.error('Error al buscar profesionales:', error);
            Alert.alert('Error', 'No se pudieron cargar los profesionales.');
        } finally {
            setLoadingSearch(false);
        }
    }, []);

    const handleSelectCategoria = (categoria) => {
        setCategoriaSeleccionada(categoria.id);
        buscarProfesionales(categoria.id, categoria.label);
    };

    const handleSolicitar = (profesional) => {
        setSelectedProfesional(profesional);
        setModalVisible(true);
    };

    const handleConfirmarSolicitud = async () => {
        if (!selectedProfesional || !categoriaSeleccionada) return;
        setLoadingRequest(true);
        try {
            const q = query(
                collection(db, 'servicios'),
                where('clienteId', '==', user.uid),
                where('profesionalId', '==', selectedProfesional.id),
                where('estado', 'in', ['pendiente', 'en_proceso'])
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                Alert.alert(
                    'Solicitud existente',
                    'Ya tienes un servicio activo con este profesional. Ve a Mis servicios para ver su estado.'
                );
                setModalVisible(false);
                return;
            }

            await addDoc(collection(db, 'servicios'), {
                clienteId: user.uid,
                profesionalId: selectedProfesional.id,
                categoria: categoriaSeleccionada,
                estado: 'pendiente',
                calificacion: null,
                comentario: null,
                calificadoEn: null,
                creadoEn: serverTimestamp(),
            });

            setModalVisible(false);
            Alert.alert('¡Solicitud enviada!', `${selectedProfesional.nombre} recibirá tu solicitud pronto.`);
        } catch (error) {
            console.error('Error al crear solicitud:', error);
            Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta de nuevo.');
        } finally {
            setLoadingRequest(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <SafeAreaView style={styles.header} edges={['top']}>
                <Text style={styles.headerTitle}>Buscar profesionales</Text>
                <Text style={styles.headerSub}>Selecciona una categoría</Text>
            </SafeAreaView>

            {/* Chips de categorías */}
            <View style={styles.chipsWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                    style={{ flexGrow: 0 }}
                >
                    {CATEGORIAS.map(c => (
                        <TouchableOpacity
                            key={c.id}
                            style={[
                                styles.chip,
                                categoriaSeleccionada === c.id && styles.chipActive
                            ]}
                            onPress={() => handleSelectCategoria(c)}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={c.icon}
                                size={13}
                                color={categoriaSeleccionada === c.id ? '#fff' : '#6B7280'}
                            />
                            <Text style={[
                                styles.chipText,
                                categoriaSeleccionada === c.id && styles.chipTextActive
                            ]}>
                                {c.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Contenido */}
            {!categoriaSeleccionada ? (
                <View style={styles.centered}>
                    <Ionicons name="search-outline" size={52} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                        Elige una categoría para ver los profesionales disponibles
                    </Text>
                </View>
            ) : loadingSearch ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.emptyText}>Buscando profesionales...</Text>
                </View>
            ) : profesionales.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="person-remove-outline" size={52} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                        No hay profesionales disponibles en esta categoría aún
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={profesionales}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ProfessionalCard item={item} onSolicitar={handleSolicitar} />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <ConfirmModal
                visible={modalVisible}
                profesional={selectedProfesional}
                categoria={categoriaSeleccionada}
                onConfirm={handleConfirmarSolicitud}
                onCancel={() => setModalVisible(false)}
                loading={loadingRequest}
            />
        </View>
    );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
    emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },

    header: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        paddingTop: 16, paddingBottom: 16,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

    chipsWrapper: {
        backgroundColor: '#fff',
        borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB',
    },
    chipsContainer: {
        paddingHorizontal: 14, paddingVertical: 10,
        gap: 8, alignItems: 'center',
    },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 0.5,
        borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
        alignSelf: 'flex-start',
    },
    chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    chipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    chipTextActive: { color: '#fff', fontWeight: '600' },

    list: { padding: 16, gap: 12 },

    card: {
        backgroundColor: '#fff', borderRadius: 14,
        padding: 14, borderWidth: 0.5, borderColor: '#E5E7EB',
    },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center',
        gap: 10, marginBottom: 10,
    },
    avatar: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: '#DBEAFE',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 14, fontWeight: '700', color: '#1E40AF' },
    profesionalName: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 3 },
    ratingText: { fontSize: 11, color: '#6B7280', marginLeft: 2 },

    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    badge: {
        backgroundColor: '#EFF6FF', paddingHorizontal: 9,
        paddingVertical: 3, borderRadius: 20,
    },
    badgeText: { fontSize: 11, color: '#2563EB', fontWeight: '500' },

    solicitarBtn: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 7,
        backgroundColor: '#2563EB', padding: 11, borderRadius: 10,
    },
    solicitarBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

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
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 14 },
    modalInfoBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#EFF6FF', borderRadius: 10,
        padding: 12, marginBottom: 20,
    },
    modalInfoText: { flex: 1, fontSize: 13, color: '#2563EB', lineHeight: 18 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
        flex: 1, padding: 13, borderRadius: 10,
        borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
    confirmBtn: { flex: 1, padding: 13, borderRadius: 10, backgroundColor: '#2563EB', alignItems: 'center' },
    confirmBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});

export default SearchProfessionalsScreen;