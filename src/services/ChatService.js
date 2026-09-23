import {
    collection, doc, setDoc, addDoc, updateDoc, getDoc,
    onSnapshot, query, where, orderBy, serverTimestamp, increment,
} from "firebase/firestore";
import { db } from "./firebaseService";

// ─── Identificador determinístico del chat ────────────────────────────────────
// Evita crear chats duplicados entre las mismas dos personas.
export const getChatId = (uidA, uidB) => [uidA, uidB].sort().join('_');

// ─── Caché simple de perfiles (nombre/rol) para no repetir lecturas ───────────
const perfilCache = {};

export const getPerfil = async (uid) => {
    if (perfilCache[uid]) return perfilCache[uid];
    const snap = await getDoc(doc(db, 'usuarios', uid));
    const data = snap.exists() ? snap.data() : { nombre: 'Usuario' };
    perfilCache[uid] = data;
    return data;
};

// ─── Crear el chat si no existe (se llama al pulsar "Chatear") ────────────────
export const ensureChat = async (miUid, otroUid, servicioId = null) => {
    const chatId = getChatId(miUid, otroUid);
    const ref = doc(db, 'chats', chatId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            participantes: [miUid, otroUid],
            servicioId,
            ultimoMensaje: '',
            ultimoMensajeEn: serverTimestamp(),
            ultimoMensajeDe: null,
            noLeidos: { [miUid]: 0, [otroUid]: 0 },
            creadoEn: serverTimestamp(),
        });
    } else if (servicioId && !snap.data().servicioId) {
        // Si el chat ya existía sin servicio asociado, lo vinculamos.
        await updateDoc(ref, { servicioId });
    }

    return chatId;
};

// ─── Enviar un mensaje ─────────────────────────────────────────────────────────
export const enviarMensaje = async (chatId, deUid, otroUid, texto) => {
    const textoLimpio = texto.trim();
    if (!textoLimpio) return;

    const mensajesRef = collection(db, 'chats', chatId, 'mensajes');
    await addDoc(mensajesRef, {
        de: deUid,
        texto: textoLimpio,
        creadoEn: serverTimestamp(),
        leido: false,
    });

    await updateDoc(doc(db, 'chats', chatId), {
        ultimoMensaje: textoLimpio,
        ultimoMensajeEn: serverTimestamp(),
        ultimoMensajeDe: deUid,
        [`noLeidos.${otroUid}`]: increment(1),
        [`noLeidos.${deUid}`]: 0,
    });
};

// ─── Marcar como leído (al abrir la conversación) ─────────────────────────────
export const marcarComoLeido = async (chatId, miUid) => {
    try {
        await updateDoc(doc(db, 'chats', chatId), {
            [`noLeidos.${miUid}`]: 0,
        });
    } catch (error) {
        console.error('Error al marcar chat como leído:', error);
    }
};

// ─── Escuchar la lista de chats del usuario en tiempo real ────────────────────
export const escucharChats = (miUid, callback, onError) => {
    const q = query(
        collection(db, 'chats'),
        where('participantes', 'array-contains', miUid)
    );

    return onSnapshot(q, async (snap) => {
        const base = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const enriquecidos = await Promise.all(base.map(async (chat) => {
            const otroUid = chat.participantes.find(uid => uid !== miUid);
            const perfil = await getPerfil(otroUid);
            return {
                ...chat,
                _otroUid: otroUid,
                _otroNombre: perfil.nombre || 'Usuario',
                _noLeidos: chat.noLeidos?.[miUid] || 0,
            };
        }));

        // Orden manual por fecha del último mensaje (evita índice compuesto extra)
        enriquecidos.sort((a, b) => {
            const ta = a.ultimoMensajeEn?.toDate?.() || 0;
            const tb = b.ultimoMensajeEn?.toDate?.() || 0;
            return tb - ta;
        });

        callback(enriquecidos);
    }, (error) => {
        console.error('Error al escuchar chats:', error);
        if (onError) onError(error);
    });
};

// ─── Escuchar los mensajes de una conversación en tiempo real ─────────────────
export const escucharMensajes = (chatId, callback, onError) => {
    const q = query(
        collection(db, 'chats', chatId, 'mensajes'),
        orderBy('creadoEn', 'asc')
    );

    return onSnapshot(q, (snap) => {
        const mensajes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(mensajes);
    }, (error) => {
        console.error('Error al escuchar mensajes:', error);
        if (onError) onError(error);
    });
};