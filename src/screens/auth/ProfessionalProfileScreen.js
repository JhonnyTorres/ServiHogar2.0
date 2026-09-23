import { useState } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet,
    TextInput, ActivityIndicator, Alert, ScrollView
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../services/firebaseService";
import colors from "../../constants/colors";

const SERVICIOS = [
    { id: 'plomeria', label: 'Plomería' },
    { id: 'electricidad', label: 'Electricidad' },
    { id: 'construccion', label: 'Construcción' },
    { id: 'pintura', label: 'Pintura' },
    { id: 'carpinteria', label: 'Carpintería' },
    { id: 'cerrajeria', label: 'Cerrajería' },
    { id: 'jardineria', label: 'Jardinería' },
    { id: 'limpieza', label: 'Limpieza' },
    { id: 'gas', label: 'Gas' },
    { id: 'climatizacion', label: 'Climatización' },
];

const MAX_DESC = 300;

const ProfessionalProfileScreen = () => {
    const [selectedServices, setSelectedServices] = useState([]);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();
    const route = useRoute();
    const { name, email, password } = route.params;

    const toggleService = (id) => {
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleRegister = async () => {
        if (selectedServices.length === 0) {
            Alert.alert('Selecciona al menos un servicio', 'Elige las áreas en las que trabajas.');
            return;
        }

        if (!description.trim()) {
            Alert.alert('Agrega una descripción', 'Cuéntales a los clientes sobre tu experiencia.');
            return;
        }

        setLoading(true);
        try {
            // 1. Crear usuario en Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Actualizar nombre en Auth
            await updateProfile(user, { displayName: name });

            // 3. Guardar perfil completo en Firestore
            await setDoc(doc(db, 'usuarios', user.uid), {
                uid: user.uid,
                nombre: name,
                email: email,
                rol: 'profesional',
                servicios: selectedServices,       // ej: ['plomeria', 'electricidad']
                descripcion: description.trim(),
                creadoEn: serverTimestamp(),
            });

            // El AuthContext detecta el usuario y redirige automáticamente
            Alert.alert('¡Registro exitoso!', 'Tu perfil profesional ha sido creado.');

        } catch (error) {
            let errorMessage = 'Error al registrar usuario';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Ya existe una cuenta con este correo electrónico';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'El formato del correo electrónico no es válido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es muy débil';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Error de conexión. Verifica tu internet';
                    break;
                default:
                    errorMessage = `${error.message || 'Error desconocido'} (Código: ${error.code})`;
            }
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formContainer}>
                    <Text style={styles.title}>Tus servicios</Text>
                    <Text style={styles.subtitle}>Selecciona las áreas en las que trabajas</Text>

                    {/* Chips de categorías */}
                    <View style={styles.chipsContainer}>
                        {SERVICIOS.map((s) => {
                            const isSelected = selectedServices.includes(s.id);
                            return (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[styles.chip, isSelected && styles.chipSelected]}
                                    onPress={() => toggleService(s.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Descripción */}
                    <Text style={styles.label}>Describe tu experiencia</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Ej: Tengo 5 años de experiencia en instalaciones eléctricas residenciales..."
                        placeholderTextColor={colors.suave}
                        value={description}
                        onChangeText={(text) => {
                            if (text.length <= MAX_DESC) setDescription(text);
                        }}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        autoCapitalize="sentences"
                    />
                    <Text style={styles.charCount}>{description.length} / {MAX_DESC}</Text>

                    <TouchableOpacity
                        style={[styles.button, (loading || selectedServices.length === 0) && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading || selectedServices.length === 0}
                    >
                        {loading
                            ? <ActivityIndicator color={colors.iluminado} />
                            : <Text style={styles.buttonText}>Finalizar registro</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.linkText}>← Volver</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    formContainer: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: colors.iluminado,
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: colors.suave,
        marginBottom: 20,
        textAlign: 'center',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
        width: '100%',
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: colors.suave,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    chipSelected: {
        backgroundColor: colors.variante5,
        borderColor: colors.iluminado,
    },
    chipText: {
        fontSize: 13,
        color: colors.suave,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: colors.iluminado,
    },
    label: {
        alignSelf: 'flex-start',
        fontSize: 14,
        color: colors.iluminado,
        marginBottom: 8,
        fontWeight: '500',
    },
    textArea: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        padding: 14,
        color: colors.iluminado,
        fontSize: 14,
        minHeight: 100,
    },
    charCount: {
        alignSelf: 'flex-end',
        fontSize: 12,
        color: colors.suave,
        marginTop: 4,
        marginBottom: 16,
    },
    button: {
        backgroundColor: colors.variante5,
        paddingVertical: 15,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        marginBottom: 14,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.iluminado,
        fontSize: 17,
        fontWeight: 'bold',
    },
    linkText: {
        color: colors.iluminado,
        fontSize: 15,
        textDecorationLine: 'underline',
    },
});

export default ProfessionalProfileScreen;