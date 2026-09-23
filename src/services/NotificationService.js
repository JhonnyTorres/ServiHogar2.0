import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseService";

// Desde el SDK 53, Expo Go ya no soporta notificaciones push remotas, y el
// simple hecho de importar "expo-notifications" dispara un registro
// automático que hace crashear la app dentro de Expo Go. Por eso NO se
// importa de forma estática: solo se carga con require() cuando NO estamos
// en Expo Go (o sea, en un development build o app compilada).
const esExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications = null;
if (!esExpoGo) {
    Notifications = require("expo-notifications");

    // ─── Cómo se muestran las notificaciones si la app está en primer plano ───
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

// ─── Pedir permiso + obtener el Expo Push Token ───────────────────────────────
export const registrarParaNotificaciones = async () => {
    if (esExpoGo || !Notifications) {
        console.log('Notificaciones push no disponibles en Expo Go (SDK 53+). Usa un development build.');
        return null;
    }

    if (!Device.isDevice) {
        console.log('Las notificaciones push requieren un dispositivo físico.');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Permiso de notificaciones denegado.');
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
        });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
    );

    return token;
};

// ─── Guardar el token en el perfil del usuario ────────────────────────────────
export const guardarPushToken = async (uid, token) => {
    if (!uid || !token) return;
    try {
        await updateDoc(doc(db, 'usuarios', uid), { pushToken: token });
    } catch (error) {
        console.error('Error al guardar el push token:', error);
    }
};

// ─── Hook para usar en App.js o AuthContext ───────────────────────────────────
// Registra el token al iniciar sesión y navega al tocar una notificación.
// En Expo Go, este hook no hace nada (no importa expo-notifications).
export const useNotificaciones = (uid, navigationRef) => {
    const responseListener = useRef();
    const notificationListener = useRef();

    useEffect(() => {
        if (!uid || esExpoGo || !Notifications) return;

        registrarParaNotificaciones().then(token => {
            if (token) guardarPushToken(uid, token);
        });

        // Notificación recibida con la app abierta (opcional: analytics, badges)
        notificationListener.current = Notifications.addNotificationReceivedListener(() => { });

        // El usuario tocó la notificación
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data || {};

            if (!navigationRef?.current) return;

            if (data.tipo === 'chat' && data.chatId) {
                navigationRef.current.navigate('Chat', {
                    chatId: data.chatId,
                    otroUid: data.otroUid,
                    otroNombre: data.otroNombre,
                });
            } else if (data.tipo === 'nueva_solicitud') {
                navigationRef.current.navigate('Main', { screen: 'MisSolicitudes' });
            } else if (data.tipo === 'cambio_estado') {
                navigationRef.current.navigate('Main', { screen: 'MisServicios' });
            }
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [uid, navigationRef]);
};