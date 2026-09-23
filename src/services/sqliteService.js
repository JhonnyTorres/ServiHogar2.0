import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('servihogar.db');

// ─── Inicialización de tablas ─────────────────────────────────────────────────

const init = () => {
    // Tabla de búsquedas recientes por categoría
    db.runSync(`
        CREATE TABLE IF NOT EXISTS busquedas_recientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria_id TEXT NOT NULL,
            categoria_label TEXT NOT NULL,
            fecha TEXT NOT NULL
        );
    `);

    // Tabla de caché local de servicios del cliente
    db.runSync(`
        CREATE TABLE IF NOT EXISTS servicios_cache (
            id TEXT PRIMARY KEY,
            cliente_id TEXT NOT NULL,
            profesional_id TEXT,
            profesional_nombre TEXT,
            categoria TEXT NOT NULL,
            estado TEXT NOT NULL,
            creado_en TEXT,
            calificacion INTEGER,
            comentario TEXT,
            sincronizado INTEGER DEFAULT 1
        );
    `);

    // Tabla de profesionales vistos recientemente
    db.runSync(`
        CREATE TABLE IF NOT EXISTS profesionales_recientes (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            servicios TEXT NOT NULL,
            suma_calificaciones REAL DEFAULT 0,
            total_calificaciones INTEGER DEFAULT 0,
            fecha_vista TEXT NOT NULL
        );
    `);
};

// ─── Búsquedas recientes ──────────────────────────────────────────────────────

const guardarBusqueda = (categoriaId, categoriaLabel) => {
    // Evitar duplicados — borrar si ya existe
    db.runSync(
        `DELETE FROM busquedas_recientes WHERE categoria_id = ?;`,
        [categoriaId]
    );
    db.runSync(
        `INSERT INTO busquedas_recientes (categoria_id, categoria_label, fecha)
         VALUES (?, ?, ?);`,
        [categoriaId, categoriaLabel, new Date().toISOString()]
    );
    // Mantener solo las últimas 5 búsquedas
    db.runSync(`
        DELETE FROM busquedas_recientes
        WHERE id NOT IN (
            SELECT id FROM busquedas_recientes
            ORDER BY fecha DESC LIMIT 5
        );
    `);
};

const getBusquedasRecientes = () => {
    return db.getAllSync(
        `SELECT * FROM busquedas_recientes ORDER BY fecha DESC LIMIT 5;`
    );
};

const limpiarBusquedas = () => {
    db.runSync(`DELETE FROM busquedas_recientes;`);
};

// ─── Caché de servicios ───────────────────────────────────────────────────────

const guardarServiciosCache = (servicios) => {
    for (const s of servicios) {
        db.runSync(
            `INSERT OR REPLACE INTO servicios_cache
             (id, cliente_id, profesional_id, profesional_nombre, categoria,
              estado, creado_en, calificacion, comentario, sincronizado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
            [
                s.id,
                s.clienteId,
                s.profesionalId || null,
                s._profesionalNombre || null,
                s.categoria,
                s.estado,
                s.creadoEn ? new Date(s.creadoEn.toDate?.() || s.creadoEn).toISOString() : null,
                s.calificacion || null,
                s.comentario || null,
            ]
        );
    }
};

const getServiciosCache = (clienteId) => {
    return db.getAllSync(
        `SELECT * FROM servicios_cache
         WHERE cliente_id = ?
         ORDER BY creado_en DESC;`,
        [clienteId]
    );
};

const actualizarEstadoCache = (servicioId, nuevoEstado) => {
    db.runSync(
        `UPDATE servicios_cache SET estado = ?, sincronizado = 0
         WHERE id = ?;`,
        [nuevoEstado, servicioId]
    );
};

const actualizarCalificacionCache = (servicioId, calificacion, comentario) => {
    db.runSync(
        `UPDATE servicios_cache
         SET calificacion = ?, comentario = ?, sincronizado = 0
         WHERE id = ?;`,
        [calificacion, comentario, servicioId]
    );
};

const limpiarCacheServicios = (clienteId) => {
    db.runSync(
        `DELETE FROM servicios_cache WHERE cliente_id = ?;`,
        [clienteId]
    );
};

// ─── Profesionales recientes ──────────────────────────────────────────────────

const guardarProfesionalReciente = (profesional) => {
    db.runSync(
        `INSERT OR REPLACE INTO profesionales_recientes
         (id, nombre, servicios, suma_calificaciones, total_calificaciones, fecha_vista)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
            profesional.id,
            profesional.nombre,
            JSON.stringify(profesional.servicios || []),
            profesional.sumaCalificaciones || 0,
            profesional.totalCalificaciones || 0,
            new Date().toISOString(),
        ]
    );
    // Mantener solo los últimos 10
    db.runSync(`
        DELETE FROM profesionales_recientes
        WHERE id NOT IN (
            SELECT id FROM profesionales_recientes
            ORDER BY fecha_vista DESC LIMIT 10
        );
    `);
};

const getProfesionalesRecientes = () => {
    return db.getAllSync(
        `SELECT * FROM profesionales_recientes ORDER BY fecha_vista DESC;`
    );
};

const limpiarProfesionalesRecientes = () => {
    db.runSync(`DELETE FROM profesionales_recientes;`);
};

// ─── Limpiar todo (al cerrar sesión) ─────────────────────────────────────────

const limpiarTodo = () => {
    db.runSync(`DELETE FROM busquedas_recientes;`);
    db.runSync(`DELETE FROM servicios_cache;`);
    db.runSync(`DELETE FROM profesionales_recientes;`);
};

export default {
    init,
    // Búsquedas
    guardarBusqueda,
    getBusquedasRecientes,
    limpiarBusquedas,
    // Servicios
    guardarServiciosCache,
    getServiciosCache,
    actualizarEstadoCache,
    actualizarCalificacionCache,
    limpiarCacheServicios,
    // Profesionales
    guardarProfesionalReciente,
    getProfesionalesRecientes,
    limpiarProfesionalesRecientes,
    // General
    limpiarTodo,
};