import { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../navigation/AuthContext";
import {
    getChatId, ensureChat, enviarMensaje, marcarComoLeido, escucharMensajes,
} from "../services/ChatService";
import colors from "../constants/colors";

const formatHora = (ts) => {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const ChatScreen = () => {
    const { user, rol } = useAuth();
    const route = useRoute();
    const navigation = useNavigation();
    const listRef = useRef(null);

    // Se puede llegar con chatId ya existente, o solo con otroUid/otroNombre
    // (por ejemplo desde un perfil profesional o una tarjeta de servicio).
    const { otroUid, otroNombre, servicioId } = route.params || {};
    const [chatId, setChatId] = useState(route.params?.chatId || null);
    const [mensajes, setMensajes] = useState([]);
    const [texto, setTexto] = useState('');
    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);

    const colorRol = rol === 'profesional' ? colors.primaryAmber : colors.primary;

    // Asegurar que el chat existe (crea el documento si es la primera vez)
    useEffect(() => {
        if (!user || !otroUid) return;
        let activo = true;

        (async () => {
            const id = chatId || getChatId(user.uid, otroUid);
            await ensureChat(user.uid, otroUid, servicioId);
            if (activo) setChatId(id);
        })();

        return () => { activo = false; };
    }, [user, otroUid]);

    // Escuchar mensajes en tiempo real
    useEffect(() => {
        if (!chatId || !user) return;

        const unsubscribe = escucharMensajes(chatId, (data) => {
            setMensajes(data);
            setLoading(false);
        }, () => setLoading(false));

        marcarComoLeido(chatId, user.uid);

        return () => unsubscribe();
    }, [chatId, user]);

    const handleEnviar = useCallback(async () => {
        const textoActual = texto;
        if (!textoActual.trim() || !chatId || enviando) return;

        setTexto('');
        setEnviando(true);
        try {
            await enviarMensaje(chatId, user.uid, otroUid, textoActual);
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            setTexto(textoActual);
        } finally {
            setEnviando(false);
        }
    }, [texto, chatId, enviando, user, otroUid]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colorRol} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[styles.header, { backgroundColor: colorRol }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{otroNombre}</Text>
            </View>

            <FlatList
                ref={listRef}
                data={mensajes}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                    const esMio = item.de === user.uid;
                    return (
                        <View style={[styles.bubbleRow, esMio && styles.bubbleRowMio]}>
                            <View
                                style={[
                                    styles.bubble,
                                    esMio
                                        ? { backgroundColor: colorRol, borderBottomRightRadius: 4 }
                                        : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
                                ]}
                            >
                                <Text style={[styles.bubbleText, esMio && { color: '#fff' }]}>
                                    {item.texto}
                                </Text>
                                <Text style={[styles.bubbleHora, esMio && { color: 'rgba(255,255,255,0.75)' }]}>
                                    {formatHora(item.creadoEn)}
                                </Text>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>Escribe el primer mensaje para iniciar la conversación.</Text>
                    </View>
                }
            />

            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Escribe un mensaje..."
                    placeholderTextColor={colors.textMuted}
                    value={texto}
                    onChangeText={setTexto}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, { backgroundColor: colorRol, opacity: texto.trim() ? 1 : 0.5 }]}
                    onPress={handleEnviar}
                    disabled={!texto.trim() || enviando}
                >
                    <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingTop: 20, paddingBottom: 16,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1 },

    list: { padding: 16, gap: 8, flexGrow: 1 },
    bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
    bubbleRowMio: { justifyContent: 'flex-end' },
    bubble: {
        maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8,
    },
    bubbleText: { fontSize: 14, color: colors.textPrimary },
    bubbleHora: { fontSize: 10, color: colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },

    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        padding: 12, borderTopWidth: 1, borderTopColor: colors.border,
        backgroundColor: colors.card,
    },
    input: {
        flex: 1, maxHeight: 100, minHeight: 40, borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.bg,
        borderWidth: 1, borderColor: colors.border, fontSize: 14, color: colors.textPrimary,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
});

export default ChatScreen;