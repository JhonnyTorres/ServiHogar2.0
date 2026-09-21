import { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../navigation/AuthContext";
import { escucharChats } from "../services/ChatService";
import colors from "../constants/colors";

const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const formatHora = (ts) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const hoy = new Date();
    const esHoy = d.toDateString() === hoy.toDateString();
    return esHoy
        ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

const ChatListScreen = () => {
    const { user, rol } = useAuth();
    const navigation = useNavigation();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    const colorRol = rol === 'profesional' ? colors.primaryAmber : colors.primary;

    useEffect(() => {
        if (!user) return;
        const unsubscribe = escucharChats(user.uid, (data) => {
            setChats(data);
            setLoading(false);
        }, () => setLoading(false));

        return () => unsubscribe();
    }, [user]);

    const abrirChat = (chat) => {
        navigation.navigate('Chat', {
            chatId: chat.id,
            otroUid: chat._otroUid,
            otroNombre: chat._otroNombre,
        });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colorRol} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { backgroundColor: colorRol }]}>
                <Text style={styles.headerTitle}>Mensajes</Text>
            </View>

            {chats.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>
                        Aún no tienes conversaciones. Inicia un chat desde un servicio o un perfil profesional.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={chats}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => abrirChat(item)}>
                            <View style={[styles.avatar, { backgroundColor: colors.chipBg }]}>
                                <Text style={[styles.avatarText, { color: colorRol }]}>
                                    {initials(item._otroNombre)}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={styles.rowBetween}>
                                    <Text style={styles.nombre} numberOfLines={1}>{item._otroNombre}</Text>
                                    <Text style={styles.hora}>{formatHora(item.ultimoMensajeEn)}</Text>
                                </View>
                                <View style={styles.rowBetween}>
                                    <Text
                                        style={[
                                            styles.ultimoMensaje,
                                            item._noLeidos > 0 && styles.ultimoMensajeNoLeido,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {item.ultimoMensaje || 'Inicia la conversación'}
                                    </Text>
                                    {item._noLeidos > 0 && (
                                        <View style={[styles.badge, { backgroundColor: colorRol }]}>
                                            <Text style={styles.badgeText}>{item._noLeidos}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },

    list: { padding: 20, gap: 12 },
    card: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.card, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: colors.border,
    },
    avatar: {
        width: 46, height: 46, borderRadius: 23,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 15, fontWeight: '700' },

    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nombre: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, flex: 1, marginRight: 8 },
    hora: { fontSize: 11, color: colors.textMuted },
    ultimoMensaje: { fontSize: 13, color: colors.textMuted, flex: 1, marginRight: 8 },
    ultimoMensajeNoLeido: { color: colors.textPrimary, fontWeight: '600' },

    badge: {
        minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
        alignItems: 'center', justifyContent: 'center',
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export default ChatListScreen;