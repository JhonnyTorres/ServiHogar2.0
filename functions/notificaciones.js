const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { Expo } = require("expo-server-sdk");

const db = admin.firestore();
const expo = new Expo();

const LABEL_SERVICIOS = {
    plomeria: 'Plomería', electricidad: 'Electricidad', construccion: 'Construcción',
    pintura: 'Pintura', carpinteria: 'Carpintería', cerrajeria: 'Cerrajería',
    jardineria: 'Jardinería', aseo: 'Aseo', gas: 'Gas', climatizacion: 'Climatización',
    domicilios: 'Domicilios', cuidado_ninos: 'Cuidado de niños',
    adultos_mayores: 'Cuidado de adultos mayores', servicios_gen: 'Servicios generales',
};

const ESTADO_LABEL = {
    en_proceso: 'fue aceptado y está en proceso',
    finalizado: 'fue marcado como finalizado',
    rechazado: 'fue rechazado',
};

// ─── Helper: enviar un push a un uid (lee su token desde usuarios/{uid}) ──────
async function enviarPush(uid, titulo, cuerpo, data = {}) {
    if (!uid) return;

    const snap = await db.collection('usuarios').doc(uid).get();
    const token = snap.data()?.pushToken;

    if (!token || !Expo.isExpoPushToken(token)) {
        console.log(`Usuario ${uid} sin push token válido, se omite notificación.`);
        return;
    }

    const mensajes = [{
        to: token,
        sound: 'default',
        title: titulo,
        body: cuerpo,
        data,
    }];

    try {
        const tickets = await expo.sendPushNotificationsAsync(mensajes);
        console.log('Push enviado:', tickets);
    } catch (error) {
        console.error('Error enviando push:', error);
    }
}

// ─── 1. Nuevo mensaje de chat ──────────────────────────────────────────────────
exports.onNuevoMensaje = onDocumentCreated(
    "chats/{chatId}/mensajes/{mensajeId}",
    async (event) => {
        const mensaje = event.data.data();
        const { chatId } = event.params;

        const chatSnap = await db.collection('chats').doc(chatId).get();
        const chat = chatSnap.data();
        if (!chat) return;

        const destinatarioUid = chat.participantes.find(uid => uid !== mensaje.de);
        const remitenteSnap = await db.collection('usuarios').doc(mensaje.de).get();
        const remitenteNombre = remitenteSnap.data()?.nombre || 'Alguien';

        await enviarPush(
            destinatarioUid,
            remitenteNombre,
            mensaje.texto,
            {
                tipo: 'chat',
                chatId,
                otroUid: mensaje.de,
                otroNombre: remitenteNombre,
            }
        );
    }
);

// ─── 2. Nueva solicitud de servicio → notifica al profesional ────────────────
exports.onNuevaSolicitud = onDocumentCreated(
    "servicios/{servicioId}",
    async (event) => {
        const servicio = event.data.data();
        const categoriaLabel = LABEL_SERVICIOS[servicio.categoria] || servicio.categoria;

        await enviarPush(
            servicio.profesionalId,
            'Nueva solicitud de servicio',
            `Tienes una nueva solicitud de ${categoriaLabel}.`,
            { tipo: 'nueva_solicitud', servicioId: event.params.servicioId }
        );
    }
);

// ─── 3. Cambio de estado del servicio → notifica al cliente ──────────────────
exports.onCambioEstadoServicio = onDocumentUpdated(
    "servicios/{servicioId}",
    async (event) => {
        const antes = event.data.before.data();
        const despues = event.data.after.data();

        if (antes.estado === despues.estado) return; // no cambió el estado
        const mensajeEstado = ESTADO_LABEL[despues.estado];
        if (!mensajeEstado) return; // ej. no notificamos "pendiente"

        const categoriaLabel = LABEL_SERVICIOS[despues.categoria] || despues.categoria;

        await enviarPush(
            despues.clienteId,
            'Actualización de tu servicio',
            `Tu solicitud de ${categoriaLabel} ${mensajeEstado}.`,
            { tipo: 'cambio_estado', servicioId: event.params.servicioId }
        );
    }
);