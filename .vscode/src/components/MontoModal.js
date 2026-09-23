import { useState } from "react";
import {
    Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import colors from "../constants/colors";

// ─── Modal genérico para capturar un monto (+ descripción opcional) ──────────
// Se usa tanto para la cotización (al aceptar) como para la factura (al finalizar).
const MontoModal = ({
    visible, titulo, subtitulo, montoInicial = '', pedirDescripcion = false,
    onConfirmar, onCancelar,
}) => {
    const [monto, setMonto] = useState(String(montoInicial || ''));
    const [descripcion, setDescripcion] = useState('');

    const montoValido = Number(monto) > 0;

    const handleConfirmar = () => {
        if (!montoValido) return;
        onConfirmar({ monto: Number(monto), descripcion: descripcion.trim() });
        setMonto('');
        setDescripcion('');
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancelar}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <Text style={styles.titulo}>{titulo}</Text>
                    {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}

                    <Text style={styles.label}>Valor del servicio (COP)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: 80000"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={monto}
                        onChangeText={setMonto}
                        autoFocus
                    />

                    {pedirDescripcion && (
                        <>
                            <Text style={styles.label}>Descripción (opcional)</Text>
                            <TextInput
                                style={[styles.input, styles.inputMultiline]}
                                placeholder="Ej: incluye materiales, mano de obra por 2 horas..."
                                placeholderTextColor={colors.textMuted}
                                value={descripcion}
                                onChangeText={setDescripcion}
                                multiline
                                numberOfLines={3}
                            />
                        </>
                    )}

                    <View style={styles.botonesRow}>
                        <TouchableOpacity style={styles.btnCancelar} onPress={onCancelar}>
                            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btnConfirmar, !montoValido && { opacity: 0.5 }]}
                            onPress={handleConfirmar}
                            disabled={!montoValido}
                        >
                            <Text style={styles.btnConfirmarTexto}>Continuar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
    handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 4, alignSelf: 'center', marginBottom: 16 },

    titulo: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    subtitulo: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: 16 },

    label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 12, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: colors.border, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.textPrimary,
        backgroundColor: colors.bg,
    },
    inputMultiline: { height: 80, textAlignVertical: 'top' },

    botonesRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
    btnCancelar: {
        flex: 1, padding: 13, borderRadius: 10, alignItems: 'center',
        borderWidth: 1, borderColor: colors.border,
    },
    btnCancelarTexto: { color: colors.textMuted, fontWeight: '600' },
    btnConfirmar: {
        flex: 1, padding: 13, borderRadius: 10, alignItems: 'center',
        backgroundColor: colors.primaryAmber,
    },
    btnConfirmarTexto: { color: '#fff', fontWeight: '700' },
});

export default MontoModal;