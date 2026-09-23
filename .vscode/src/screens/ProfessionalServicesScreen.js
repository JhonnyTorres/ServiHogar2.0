import { useState, useEffect } from "react";
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
import { generarCotizacionPDF, generarFacturaPDF } from "../services/pdfService";
import colors from "../constants/colors";
import MontoModal from "../components/MontoModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_CONFIG = {
    pendiente: { label: 'Pendiente', bg: colors.warningBg, color: colors.warning, icon: 'time-outline' },
    en_proceso: { label: 'En proceso', bg: colors.infoBg, color: colors.primary, icon: 'construct-outline' },
    finalizado: { label: 'Finalizado', bg: colors.successBg, color: colors.success, icon: 'checkmark-circle-outline' },
    rechazado: { label: 'Rechazado', bg: colors.errorBg, color: colors.error, icon: 'close-circle-outline' },
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

const formatCOP = (monto) =>
    (monto || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

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

            {/* Monto cotizado / final, si existen */}
            {(item.montoCotizado || item.montoFinal) && (
                <View style={styles.montoRow}>
                    <Text style={styles.montoLabel}>
                        {item.estado === 'finalizado' ? 'Valor final' : 'Cotizado'}
                    </Text>
                    <Text style={styles.montoValor}>
                        {formatCOP(item.estado === 'finalizado' ? item.montoFinal : item.montoCotizado)}
                    </Text>
                </View>
            )}

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
                                color={n <= item.calificacion ? colors.primaryAmber : colors.border}
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
                <ActivityIndicator style={{ marginTop: 12 }} color={colors.primaryAmber} />
            ) : (
                <>
                    {item.estado === 'pendiente' && (
                        <View style={styles.botonesRow}>
                            <TouchableOpacity
                                style={styles.btnRechazar}
                                onPress={() => onRechazar(item.id)}
                            >
                                <Ionicons name="close-outline" size={18} color={colors.error} />
                                <Text style={styles.btnRechazarText}>Rechazar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.btnAceptar}
                                onPress={() => onAceptar(item)}
                            >
                                <Ionicons name="checkmark-outline" size={18} color="#fff" />
                                <Text style={styles.btnAceptarText}>Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {item.estado === 'en_proceso' && (
                        <TouchableOpacity
                            style={styles.btnFinalizar}
                            onPress={() => onFinalizar(item)}
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
    const [profesionalNombre, setProfesionalNombre] = useState('');

    // Modal de monto: guarda a qué solicitud aplica y de qué tipo es
    const [modalMonto, setModalMonto] = useState(null); // { servicio, tipo: 'cotizacion' | 'factura' }

    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, 'usuarios', user.uid)).then(snap => {
            setProfesionalNombre(snap.data()?.nombre || '');
        });
    }, [user]);

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

    const actualizarServicio = async (servicioId, cambios) => {
        setLoadingId(servicioId);
        try {
            await updateDoc(doc(db, 'servicios', servicioId), cambios);
        } catch (error) {
            console.error('Error al actualizar el servicio:', error);
            Alert.alert('Error', 'No se pudo actualizar el servicio.');
        } finally {
            setLoadingId(null);
        }
    };

    // ─── Aceptar → abre modal de cotización ────────────────────────────────────
    const handleAceptar = (item) => {
        setModalMonto({ servicio: item, tipo: 'cotizacion' });
    };

    const handleRechazar = (id) => {
        Alert.alert(
            'Rechazar solicitud',
            '¿Seguro que quieres rechazar este servicio?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Rechazar', style: 'destructive', onPress: () => actualizarServicio(id, { estado: 'rechazado' }) },
            ]
        );
    };

    // ─── Finalizar → abre modal de factura ─────────────────────────────────────
    const handleFinalizar = (item) => {
        setModalMonto({ servicio: item, tipo: 'factura' });
    };

    // ─── Confirmación del modal: guarda en Firestore y genera el PDF ──────────
    const handleConfirmarMonto = async ({ monto, descripcion }) => {
        const { servicio, tipo } = modalMonto;
        setModalMonto(null);

        try {
            if (tipo === 'cotizacion') {
                await actualizarServicio(servicio.id, {
                    estado: 'en_proceso',
                    montoCotizado: monto,
                    descripcionCotizacion: descripcion || null,
                });
                await generarCotizacionPDF({
                    servicio,
                    clienteNombre: servicio._clienteNombre,
                    profesionalNombre,
                    monto,
                    descripcion,
                });
            } else {
                await actualizarServicio(servicio.id, {
                    estado: 'finalizado',
                    montoFinal: monto,
                });
                await generarFacturaPDF({
                    servicio,
                    clienteNombre: servicio._clienteNombre,
                    profesionalNombre,
                    monto,
                });
            }
        } catch (error) {
            console.error('Error al generar el documento:', error);
            Alert.alert('Documento no generado', 'El servicio se actualizó, pero no se pudo generar el PDF.');
        }
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
                <ActivityIndicator size="large" color={colors.primaryAmber} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Encabezado sólido ámbar (rol profesional) */}
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
                    <Ionicons name="clipboard-outline" size={48} color={colors.textMuted} />
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

            <MontoModal
                visible={!!modalMonto}
                titulo={modalMonto?.tipo === 'cotizacion' ? 'Cotizar servicio' : 'Finalizar y facturar'}
                subtitulo={
                    modalMonto
                        ? `${LABEL_SERVICIOS[modalMonto.servicio.categoria] || modalMonto.servicio.categoria} · ${modalMonto.servicio._clienteNombre}`
                        : ''
                }
                montoInicial={modalMonto?.tipo === 'factura' ? modalMonto.servicio.montoCotizado : ''}
                pedirDescripcion={modalMonto?.tipo === 'cotizacion'}
                onConfirmar={handleConfirmarMonto}
                onCancelar={() => setModalMonto(null)}
            />
        </View>
    );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
    emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },

    header: {
        backgroundColor: colors.primaryAmber, paddingHorizontal: 20,
        paddingTop: 20, paddingBottom: 16,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    badgePendientes: {
        backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12,
        paddingVertical: 6, borderRadius: 20,
    },
    badgePendientesText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    filtrosContainer: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
    filtroChip: {
        paddingHorizontal: 16, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    },
    filtroChipActive: { backgroundColor: colors.primaryAmber, borderColor: colors.primaryAmber },
    filtroText: { fontSize: 13, color: colors.textMuted },
    filtroTextActive: { color: '#fff', fontWeight: '600' },

    list: { padding: 0, gap: 0, paddingBottom: 24 },

    card: {
        backgroundColor: colors.card, borderRadius: 14,
        padding: 16, borderWidth: 1, borderColor: colors.border, marginHorizontal: 20,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 12,
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    cardDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    badge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    badgeText: { fontSize: 11, fontWeight: '600' },

    clienteRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.bg, borderRadius: 10, padding: 10,
    },
    avatar: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontWeight: '600', color: colors.primaryAmber },
    clienteNombre: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    clienteEmail: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

    montoRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border,
    },
    montoLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    montoValor: { fontSize: 15, color: colors.textPrimary, fontWeight: '700' },

    calificacionRow: {
        marginTop: 12, borderTopWidth: 1,
        borderTopColor: colors.border, paddingTop: 10,
    },
    calLabel: { fontSize: 13, color: colors.textMuted },
    calComentario: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginTop: 6 },

    botonesRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    btnRechazar: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        padding: 10, borderRadius: 10,
        borderWidth: 1, borderColor: colors.error,
        backgroundColor: colors.errorBg,
    },
    btnRechazarText: { fontSize: 14, color: colors.error, fontWeight: '600' },
    btnAceptar: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        padding: 10, borderRadius: 10,
        backgroundColor: colors.success,
    },
    btnAceptarText: { fontSize: 14, color: '#fff', fontWeight: '600' },
    btnFinalizar: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        marginTop: 12, padding: 11, borderRadius: 10,
        backgroundColor: colors.success,
    },
    btnFinalizarText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});

export default ProfessionalServicesScreen;