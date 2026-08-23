import { useState, useCallback } from "react";
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView, Modal
} from "react-native";
import {
    collection, query, where, getDocs,
    addDoc, serverTimestamp
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
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

const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ─── Componente de estrellas ──────────────────────────────────────────────────

const Stars = ({ value = 0, count = 0 }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(n => (
            <Ionicons
                key={n}
                name={n <= Math.round(value) ? 'star' : 'star-outline'}
                size={13}
                color={n <= Math.round(value) ? '#EF9F27' : '#ccc'}
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
                <Text style={styles.modalTitle}>Confirmar solicitud</Text>
                <Text style={styles.modalSubtitle}>
                    ¿Quieres solicitar el servicio de {LABEL_SERVICIOS[categoria]} a{' '}
                    <Text style={{ fontWeight: '600' }}>{profesional?.nombre}</Text>?
                </Text>

                <View style={styles.modalInfo}>
                    <Ionicons name="information-circle-outline" size={16} color="#185FA5" />
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
    const serviciosLabel = (item.servicios || []).map(s => LABEL_SERVICIOS[s] || s);

    // Calcular promedio desde los campos guardados en el perfil
    const promedio = item.totalCalificaciones > 0
        ? Math.round((item.sumaCalificaciones / item.totalCalificaciones) * 10) / 10
        : 0;

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

            <TouchableOpacity style={styles.solicitarBtn} onPress={() => onSolicitar(item)}>
                <Ionicons name="paper-plane-outline" size={16} color="#fff" />
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

    const buscarProfesionales = useCallback(async (categoriaId) => {
        setLoadingSearch(true);
        setProfesionales([]);
        try {
            // Buscar profesionales que tengan la categoría seleccionada
            // Requiere índice compuesto: rol (Asc) + servicios (Arrays)
            const q = query(
                collection(db, 'usuarios'),
                where('rol', '==', 'profesional'),
                where('servicios', 'array-contains', categoriaId)
            );
            const snap = await getDocs(q);
            const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Ordenar por calificación promedio descendente
            // El promedio se calcula desde sumaCalificaciones / totalCalificaciones
            // guardados directamente en el perfil — sin consultas adicionales
            lista.sort((a, b) => {
                const proA = a.totalCalificaciones > 0
                    ? a.sumaCalificaciones / a.totalCalificaciones : 0;
                const proB = b.totalCalificaciones > 0
                    ? b.sumaCalificaciones / b.totalCalificaciones : 0;
                return proB - proA;
            });

            setProfesionales(lista);
        } catch (error) {
            console.error('Error al buscar profesionales:', error);
            Alert.alert('Error', 'No se pudieron cargar los profesionales.');
        } finally {
            setLoadingSearch(false);
        }
    }, []);

    const handleSelectCategoria = (categoria) => {
        setCategoriaSeleccionada(categoria.id);
        buscarProfesionales(categoria.id);
    };

    const handleSolicitar = (profesional) => {
        setSelectedProfesional(profesional);
        setModalVisible(true);
    };

    const handleConfirmarSolicitud = async () => {
        if (!selectedProfesional || !categoriaSeleccionada) return;
        setLoadingRequest(true);
        try {
            // Verificar que no haya una solicitud activa con este profesional
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
                    'Ya tienes un servicio activo con este profesional.'
                );
                setModalVisible(false);
                return;
            }

            // Crear el servicio en Firestore
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
            Alert.alert(
                '¡Solicitud enviada!',
                `${selectedProfesional.nombre} recibirá tu solicitud pronto.`
            );
        } catch (error) {
            console.error('Error al crear solicitud:', error);
            Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta de nuevo.');
        } finally {
            setLoadingRequest(false);
        }
    };

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Buscar profesionales</Text>
                <Text style={styles.headerSub}>Selecciona una categoría de servicio</Text>
            </View>

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
                    >
                        <Ionicons
                            name={c.icon}
                            size={15}
                            color={categoriaSeleccionada === c.id ? '#fff' : '#666'}
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

            {!categoriaSeleccionada ? (
                <View style={styles.centered}>
                    <Ionicons name="search-outline" size={52} color="#ccc" />
                    <Text style={styles.emptyText}>
                        Elige una categoría para ver los profesionales disponibles
                    </Text>
                </View>
            ) : loadingSearch ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.variante5} />
                    <Text style={styles.emptyText}>Buscando profesionales...</Text>
                </View>
            ) : profesionales.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="person-remove-outline" size={52} color="#ccc" />
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
        </LinearGradient>
    );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        gap: 12, paddingHorizontal: 32,
    },
    emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },

    header: {
        backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 20,
        paddingTop: 20, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.18)',
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

    chipsContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, aligenItems: 'center' },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start'
    },
    chipActive: { backgroundColor: '#fff', borderColor: '#fff' },
    chipText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    chipTextActive: { color: '#1e3a86', fontWeight: '600' },

    list: { padding: 0, paddingBottom: 24, gap: 0 },

    card: {
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
        padding: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)', marginHorizontal: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center',
        gap: 12, marginBottom: 10,
    },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#B5D4F4',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 15, fontWeight: '600', color: '#0C447C' },
    profesionalName: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 3 },
    ratingText: { fontSize: 12, color: '#888', marginLeft: 2 },

    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    badge: {
        backgroundColor: '#E6F1FB', paddingHorizontal: 10,
        paddingVertical: 4, borderRadius: 12,
    },
    badgeText: { fontSize: 12, color: '#0C447C', fontWeight: '500' },

    solicitarBtn: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8,
        backgroundColor: '#185FA5', padding: 11, borderRadius: 10,
    },
    solicitarBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#fff', borderTopLeftRadius: 20,
        borderTopRightRadius: 20, padding: 24, paddingBottom: 36,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 8 },
    modalSubtitle: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 16 },
    modalInfo: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#E6F1FB', borderRadius: 10,
        padding: 12, marginBottom: 20,
    },
    modalInfoText: { flex: 1, fontSize: 13, color: '#185FA5', lineHeight: 18 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
        flex: 1, padding: 13, borderRadius: 10,
        borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, color: '#666', fontWeight: '600' },
    confirmBtn: {
        flex: 1, padding: 13, borderRadius: 10,
        backgroundColor: '#185FA5', alignItems: 'center',
    },
    confirmBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});

export default SearchProfessionalsScreen;