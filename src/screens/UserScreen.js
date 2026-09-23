import { useState, useCallback } from "react";
import colors from "../constants/colors";
import { View, Text, Alert, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { pickImage, uploadImageToCloudinary } from "../services/cloudinaryService";
import { getUserData, updateUserProfilePhoto } from "../services/userService";
import { ScrollView } from "react-native-gesture-handler";
import { useAuth } from "../../navigation/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const UserScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [imageUri, setImageUri] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const defaultImage = '';

    const fetchUserProfile = useCallback(async () => {
        if (user) {
            setLoading(true);
            try {
                const firestoreUserData = await getUserData(user.uid);
                setUserData(firestoreUserData);
                setImageUri(firestoreUserData?.photoURL || user.photoURL || defaultImage);
            } catch (error) {
                console.error("Error al obtener los datos del perfil: ", error);
                setImageUri(user.photoURL || defaultImage);
            } finally {
                setLoading(false);
            }
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchUserProfile();
        }, [fetchUserProfile])
    );

    const handleImageSelection = async () => {
        try {
            const imageAsset = await pickImage();
            if (imageAsset) {
                setSelectedImage(imageAsset);
                setShowPreview(true);
            }
        } catch (error) {
            console.error("Error al seleccionar la imagen: ", error);
            Alert.alert('Error 😵‍💫', 'No se pudo seleccionar la imagen');
        }
    };

    const handleCancelSelection = () => {
        setSelectedImage(null);
        setShowPreview(false);
    };

    const handleConfirmUpload = async () => {
        if (!selectedImage) return;
        try {
            setLoading(true);
            setShowPreview(false);

            const imageUrl = await uploadImageToCloudinary(selectedImage.uri);
            await updateUserProfilePhoto(user.uid, imageUrl);

            setImageUri(imageUrl);
            setSelectedImage(null);
            Alert.alert('Éxito', 'Imagen de perfil actualizada satisfactoriamente!');
        } catch (error) {
            console.error('Error al cargar la imagen: ', error);
            Alert.alert('Error 😵‍💫', 'Imagen de perfil no se pudo actualizar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={colors.gradientePrimario} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Ionicons name="person-circle-outline" size={28} color="#fff" />
                        <Text style={styles.title}>Mi Perfil</Text>
                    </View>

                    <View style={styles.avatarSection}>
                        <View style={styles.largeAvatar}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarText}>{initials(user?.displayName)}</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.changePhotoBtn, loading && { opacity: 0.7 }]}
                            onPress={handleImageSelection}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#1e3a86" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="camera-outline" size={16} color="#1e3a86" />
                                    <Text style={styles.changePhotoBtnText}>Cambiar foto</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.userInfo}>
                        <View style={styles.infoItem}>
                            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.6)" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Nombre</Text>
                                <Text style={styles.infoValue}>{user?.displayName || 'Usuario'}</Text>
                            </View>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.6)" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Correo</Text>
                                <Text style={styles.infoValue}>{user?.email}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <Modal visible={showPreview} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.previewContainer}>
                            <Text style={styles.previewTitle}>Vista previa</Text>
                            {selectedImage && (
                                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                            )}
                            <View style={styles.previewButtons}>
                                <TouchableOpacity
                                    style={[styles.previewBtn, styles.cancelBtn]}
                                    onPress={handleCancelSelection}
                                >
                                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.previewBtn, styles.confirmBtn]}
                                    onPress={handleConfirmUpload}
                                >
                                    <Text style={styles.confirmBtnText}>Confirmar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 24,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    largeAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
    },
    changePhotoBtn: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    changePhotoBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e3a86',
    },
    userInfo: {
        gap: 12,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 14,
    },
    infoLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '80%',
        alignItems: 'center',
    },
    previewTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e3a86',
        marginBottom: 16,
    },
    previewImage: {
        width: 200,
        height: 200,
        borderRadius: 100,
        marginBottom: 24,
    },
    previewButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    previewBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        minWidth: 100,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#f0f0f0',
    },
    cancelBtnText: {
        color: '#666',
        fontWeight: '600',
    },
    confirmBtn: {
        backgroundColor: '#1e3a86',
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default UserScreen;