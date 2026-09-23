import { useState } from "react";
import {
    StyleSheet, View, Text, TouchableOpacity,
    ActivityIndicator, Alert
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../services/firebaseService";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";

const ROLES = [
    { id: 'cliente', label: 'Cliente', desc: 'Busco servicios para mi hogar', icon: 'home-outline' },
    { id: 'profesional', label: 'Profesional', desc: 'Ofrezco servicios del hogar', icon: 'construct-outline' },
];

const RoleSelectionScreen = () => {
    const [rolSeleccionado, setRolSeleccionado] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();
    const route = useRoute();
    const { name, email, password } = route.params || {};

    const handleContinue = async () => {
        if (!rolSeleccionado) {
            Alert.alert('Selecciona un rol', 'Elige si eres cliente o profesional.');
            return;
        }
        if (rolSeleccionado === 'profesional') {
            navigation.navigate('ProfessionalProfile', { name, email, password });
            return;
        }
        setLoading(true);
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = credential.user.uid;
            await updateProfile(credential.user, { displayName: name });
            await setDoc(doc(db, 'usuarios', uid), {
                nombre: name, email, rol: 'cliente',
                creadoEn: serverTimestamp(),
            });
        } catch (e) {
            let msg = 'Error al crear la cuenta';
            if (e.code === 'auth/email-already-in-use') msg = 'Este correo ya tiene una cuenta';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <View style={styles.inner}>
                <View style={styles.logoCircle}>
                    <Ionicons name="people-outline" size={28} color="#fff" />
                </View>
                <Text style={styles.title}>¿Cómo usarás la app?</Text>
                <Text style={styles.subtitle}>Elige tu rol para continuar</Text>

                <View style={styles.card}>
                    {ROLES.map(r => {
                        const selected = rolSeleccionado === r.id;
                        return (
                            <TouchableOpacity
                                key={r.id}
                                style={[styles.roleCard, selected && styles.roleCardSelected]}
                                onPress={() => setRolSeleccionado(r.id)}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>
                                    <Ionicons
                                        name={r.icon} size={22}
                                        color={selected ? '#1e3a86' : 'rgba(255,255,255,0.8)'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.roleLabel}>{r.label}</Text>
                                    <Text style={styles.roleDesc}>{r.desc}</Text>
                                </View>
                                <View style={[styles.dot, selected && styles.dotSelected]}>
                                    {selected && <View style={styles.dotInner} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {rolSeleccionado === 'profesional' && (
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.infoText}>
                                En el siguiente paso podrás configurar tus servicios y experiencia.
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.btnPrimary, (!rolSeleccionado || loading) && { opacity: 0.6 }]}
                        onPress={handleContinue}
                        disabled={!rolSeleccionado || loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#1e3a86" />
                            : <Text style={styles.btnPrimaryText}>
                                {rolSeleccionado === 'profesional' ? 'Continuar →' : 'Registrarse'}
                            </Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back-outline" size={16} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.btnBackText}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },

    logoCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    title: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
    subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 28, textAlign: 'center' },

    card: {
        width: '100%', maxWidth: 400,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 24, padding: 20,
    },

    roleCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 14, padding: 14, marginBottom: 10,
    },
    roleCardSelected: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.6)' },
    roleIcon: {
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    roleIconSelected: { backgroundColor: '#fff' },
    roleLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
    roleDesc: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
    dot: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
        alignItems: 'center', justifyContent: 'center',
    },
    dotSelected: { borderColor: '#fff' },
    dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },

    infoBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12, padding: 12, marginBottom: 12,
    },
    infoText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },

    btnPrimary: {
        backgroundColor: '#fff', borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
        marginTop: 4, marginBottom: 12,
    },
    btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#1e3a86' },

    btnBack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    btnBackText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
});

export default RoleSelectionScreen;