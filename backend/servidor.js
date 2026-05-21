// servidor.js - API Node/Express + MySQL/MariaDB (XAMPP)

import express from "express";
import cors from "cors";
import { poolBD } from "./bd.js";
import "dotenv/config";
import multer from "multer";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadsDir = join(__dirname, "uploads");
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `${req.params.id}${ext}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Solo se permiten imágenes"));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

const storagePerfil = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const idUsuario = Number(req.params.id_usuario);
        const ext = extname(file.originalname).toLowerCase() || ".jpg";
        const prefix = `usuario-${idUsuario}`;

        // Mantener solo una foto por usuario, aunque cambie la extensión.
        for (const f of readdirSync(uploadsDir)) {
            if (f.startsWith(prefix + ".")) {
                unlinkSync(join(uploadsDir, f));
            }
        }

        cb(null, `${prefix}${ext}`);
    }
});

const uploadPerfil = multer({
    storage: storagePerfil,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Solo se permiten imágenes"));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

const PUERTO = Number(process.env.PUERTO || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";

// Envuelve rutas async para capturar errores sin crashear el servidor
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// (Mantiene el comportamiento de tu front anterior: btoa(password))
function base64(texto) {
    return Buffer.from(String(texto), "utf8").toString("base64");
}

// Helper: insertar entrada en el log de grupo
async function insertarLog(idGrupo, idUsuario, tipoAccion, descripcion) {
    try {
        await poolBD.execute(
            "INSERT INTO log_grupo (id_grupo, id_usuario, tipo_accion, descripcion) VALUES (?, ?, ?, ?)",
            [idGrupo, idUsuario, tipoAccion, descripcion]
        );
    } catch (e) {
        console.error("[LOG ERROR]", e.message);
    }
}

// Helper: insertar notificación (compatible con y sin columna tipo)
let _notifTieneColumnaTipo = null;
async function insertarNotificacion(idUsuario, mensaje, tipo) {
    try {
        if (_notifTieneColumnaTipo === null) {
            const [cols] = await poolBD.execute("SHOW COLUMNS FROM notificacion LIKE 'tipo'");
            _notifTieneColumnaTipo = cols.length > 0;
        }
        if (_notifTieneColumnaTipo) {
            await poolBD.execute(
                "INSERT INTO notificacion (id_usuario, mensaje, tipo) VALUES (?,?,?)",
                [idUsuario, mensaje, tipo]
            );
        } else {
            await poolBD.execute(
                "INSERT INTO notificacion (id_usuario, mensaje) VALUES (?,?)",
                [idUsuario, mensaje]
            );
        }
    } catch (e) {
        console.error("[NOTIF ERROR]", e.message);
    }
}

// Healthcheck
app.get("/api/health", ah(async (req, res) => {
    const [r] = await poolBD.execute("SELECT 1 AS ok");
    res.json(r[0]);
}));

/* =========================
   AUTH
========================= */

// Registro
app.post("/api/usuarios", ah(async (req, res) => {
    const { nombre, nombre_usuario, correo_electronico, contrasena } = req.body;
    if (!nombre || !nombre_usuario || !correo_electronico || !contrasena) {
        return res.status(400).json({ error: "Faltan campos" });
    }

    const [existeEmail] = await poolBD.execute(
        "SELECT id_usuario FROM usuario WHERE correo_electronico = ?",
        [correo_electronico]
    );
    if (existeEmail.length) {
        return res.status(409).json({ error: "El email ya está registrado" });
    }

    const [existeUsuario] = await poolBD.execute(
        "SELECT id_usuario FROM usuario WHERE nombre_usuario = ?",
        [nombre_usuario]
    );
    if (existeUsuario.length) {
        return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
    }

    const hash = base64(contrasena);
    const [r] = await poolBD.execute(
        "INSERT INTO usuario (nombre, nombre_usuario, correo_electronico, hash_contrasena) VALUES (?,?,?,?)",
        [nombre, nombre_usuario, correo_electronico, hash]
    );
    res.status(201).json({ id_usuario: r.insertId });
}));

// Login
app.post("/api/login", ah(async (req, res) => {
    const { identificador, contrasena } = req.body;
    if (!identificador || !contrasena) {
        return res.status(400).json({ error: "Faltan campos" });
    }

    const [filas] = await poolBD.execute(
        "SELECT id_usuario, nombre, nombre_usuario, correo_electronico, hash_contrasena FROM usuario WHERE correo_electronico = ? OR nombre_usuario = ?",
        [identificador, identificador]
    );
    if (!filas.length) return res.status(401).json({ error: "Credenciales incorrectas" });

    const u = filas[0];
    if (u.hash_contrasena !== base64(contrasena)) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Opcional: actualizar fecha_ultimo_acceso
    await poolBD.execute(
        "UPDATE usuario SET fecha_ultimo_acceso = CURRENT_TIMESTAMP(3) WHERE id_usuario = ?",
        [u.id_usuario]
    );

    res.json({
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        nombre_usuario: u.nombre_usuario,
        correo_electronico: u.correo_electronico
    });
}));

// Actualizar usuario
app.patch("/api/usuarios/:id_usuario", ah(async (req, res) => {
    const id_usuario = Number(req.params.id_usuario);
    const { nombre, nombre_usuario, correo_electronico, contrasena } = req.body;

    const updates = [];
    const values = [];

    if (nombre) {
        updates.push("nombre = ?");
        values.push(nombre);
    }
    if (nombre_usuario) {
        // Comprobar que no está en uso por otro usuario
        const [dup] = await poolBD.execute(
            "SELECT id_usuario FROM usuario WHERE nombre_usuario = ? AND id_usuario != ?",
            [nombre_usuario, id_usuario]
        );
        if (dup.length) return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
        updates.push("nombre_usuario = ?");
        values.push(nombre_usuario);
    }
    if (correo_electronico) {
        updates.push("correo_electronico = ?");
        values.push(correo_electronico);
    }
    if (contrasena) {
        updates.push("hash_contrasena = ?");
        values.push(base64(contrasena));
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    values.push(id_usuario);

    await poolBD.execute(
        `UPDATE usuario SET ${updates.join(", ")} WHERE id_usuario = ?`,
        values
    );

    // Devolver datos actualizados
    const [[updated]] = await poolBD.execute(
        "SELECT id_usuario, nombre, nombre_usuario, correo_electronico FROM usuario WHERE id_usuario = ?",
        [id_usuario]
    );

    res.json(updated);
}));

// Obtener un usuario por ID
app.get("/api/usuarios/:id_usuario", ah(async (req, res) => {
    const id_usuario = Number(req.params.id_usuario);
    const [[usuario]] = await poolBD.execute(
        "SELECT id_usuario, nombre, nombre_usuario, correo_electronico FROM usuario WHERE id_usuario = ?",
        [id_usuario]
    );
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(usuario);
}));

// Subir foto de perfil de usuario
app.post("/api/usuarios/:id_usuario/foto", uploadPerfil.single("imagen"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió ninguna imagen" });
    res.json({ ok: true });
});

// Obtener foto de perfil de usuario
app.get("/api/usuarios/:id_usuario/foto", (req, res) => {
    const idUsuario = Number(req.params.id_usuario);
    const prefix = `usuario-${idUsuario}`;
    const files = readdirSync(uploadsDir);
    const file = files.find(f => f.startsWith(prefix + "."));
    if (!file) return res.status(404).json({ error: "No hay foto de perfil para este usuario" });
    res.sendFile(join(uploadsDir, file));
});

// Obtener todos los usuarios (para select de miembros)
app.get("/api/usuarios", ah(async (req, res) => {
    const [usuarios] = await poolBD.execute(
        "SELECT id_usuario, nombre, nombre_usuario, correo_electronico FROM usuario ORDER BY nombre ASC"
    );
    res.json(usuarios);
}));

/* =========================
   GRUPOS
========================= */

// Listar grupos de un usuario
app.get("/api/grupos", ah(async (req, res) => {
    const id_usuario = Number(req.query.id_usuario);
    if (!id_usuario) return res.status(400).json({ error: "id_usuario requerido" });

    const [grupos] = await poolBD.execute(
        `SELECT g.id_grupo, g.nombre, g.descripcion, g.divisa, g.id_admin, g.fecha_creacion,
            (SELECT COUNT(*) FROM miembro_grupo mg2 WHERE mg2.id_grupo = g.id_grupo) AS num_miembros
     FROM grupo g
     JOIN miembro_grupo mg ON mg.id_grupo = g.id_grupo
     WHERE mg.id_usuario = ?
     ORDER BY g.fecha_creacion DESC`,
        [id_usuario]
    );
    res.json(grupos);
}));

// Crear grupo + insertar admin en miembro_grupo
app.post("/api/grupos", ah(async (req, res) => {
    const { nombre, descripcion, divisa, id_admin, tipo } = req.body;
    if (!nombre || !id_admin) return res.status(400).json({ error: "Faltan campos" });

    const [r] = await poolBD.execute(
        "INSERT INTO grupo (nombre, descripcion, divisa, id_admin, tipo) VALUES (?,?,?,?,?)",
        [nombre, descripcion || null, divisa || 'EUR', Number(id_admin), tipo || 'clasico']
    );

    await poolBD.execute(
        "INSERT INTO miembro_grupo (id_grupo, id_usuario, rol) VALUES (?,?, 'admin')",
        [r.insertId, Number(id_admin)]
    );

    const [[creador]] = await poolBD.execute("SELECT nombre FROM usuario WHERE id_usuario = ?", [Number(id_admin)]);
    await insertarLog(r.insertId, Number(id_admin), "grupo_creado", `${creador?.nombre} creó el grupo "${nombre}"`);

    res.status(201).json({ id_grupo: r.insertId });
}));

// Enviar invitaciones a unirse a un grupo
app.post("/api/grupos/:id_grupo/miembros", ah(async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);
    const { usuarios_ids, id_invitador } = req.body;

    if (!id_grupo) return res.status(400).json({ error: "id_grupo inválido" });
    if (!Array.isArray(usuarios_ids)) return res.status(400).json({ error: "usuarios_ids debe ser array" });

    const [[grupoInfo]] = await poolBD.execute("SELECT nombre FROM grupo WHERE id_grupo = ?", [id_grupo]);
    const [[invitador]] = await poolBD.execute("SELECT nombre FROM usuario WHERE id_usuario = ?", [Number(id_invitador)]);

    for (const id_usuario of usuarios_ids) {
        // Saltar si ya es miembro
        const [[yaMiembro]] = await poolBD.execute(
            "SELECT 1 FROM miembro_grupo WHERE id_grupo = ? AND id_usuario = ?",
            [id_grupo, Number(id_usuario)]
        );
        if (yaMiembro) continue;

        // Saltar si ya tiene invitación pendiente
        const [[yaInvitado]] = await poolBD.execute(
            "SELECT 1 FROM invitacion_grupo WHERE id_grupo = ? AND id_usuario = ? AND estado = 'pendiente'",
            [id_grupo, Number(id_usuario)]
        );
        if (yaInvitado) continue;

        const [inv] = await poolBD.execute(
            "INSERT INTO invitacion_grupo (id_grupo, id_usuario, id_invitador) VALUES (?,?,?)",
            [id_grupo, Number(id_usuario), Number(id_invitador)]
        );
        const id_invitacion = inv.insertId;

        await insertarNotificacion(
            Number(id_usuario),
            `[invitacion:${id_invitacion}] ${invitador?.nombre || 'Alguien'} te ha invitado al grupo "${grupoInfo?.nombre || ''}"`,
            "actividad"
        );
    }

    res.json({ ok: true });
}));

// Aceptar invitación
app.post("/api/invitaciones/:id_invitacion/aceptar", ah(async (req, res) => {
    const id_invitacion = Number(req.params.id_invitacion);
    const { id_usuario } = req.body;

    const [[inv]] = await poolBD.execute(
        "SELECT * FROM invitacion_grupo WHERE id_invitacion = ? AND id_usuario = ? AND estado = 'pendiente'",
        [id_invitacion, Number(id_usuario)]
    );
    if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });

    await poolBD.execute(
        "UPDATE invitacion_grupo SET estado = 'aceptada' WHERE id_invitacion = ?",
        [id_invitacion]
    );
    await poolBD.execute(
        "INSERT IGNORE INTO miembro_grupo (id_grupo, id_usuario, rol) VALUES (?,?,'miembro')",
        [inv.id_grupo, Number(id_usuario)]
    );
    const [[u]] = await poolBD.execute("SELECT nombre FROM usuario WHERE id_usuario = ?", [Number(id_usuario)]);
    await insertarLog(inv.id_grupo, Number(id_usuario), "miembro_añadido", `${u?.nombre} se unió al grupo`);

    res.json({ ok: true });
}));

// Rechazar invitación
app.post("/api/invitaciones/:id_invitacion/rechazar", ah(async (req, res) => {
    const id_invitacion = Number(req.params.id_invitacion);
    const { id_usuario } = req.body;

    const [[inv]] = await poolBD.execute(
        "SELECT * FROM invitacion_grupo WHERE id_invitacion = ? AND id_usuario = ? AND estado = 'pendiente'",
        [id_invitacion, Number(id_usuario)]
    );
    if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });

    await poolBD.execute(
        "UPDATE invitacion_grupo SET estado = 'rechazada' WHERE id_invitacion = ?",
        [id_invitacion]
    );
    res.json({ ok: true });
}));

// Detalle de grupo (grupo + miembros + transacciones + participantes por transacción)
app.get("/api/grupos/:id_grupo", ah(async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);

    const [[grupo]] = await poolBD.execute("SELECT * FROM grupo WHERE id_grupo = ?", [id_grupo]);
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

    const [miembros] = await poolBD.execute(
        `SELECT u.id_usuario, u.nombre, u.nombre_usuario, u.correo_electronico, mg.rol, COALESCE(u.offline,0) AS offline
     FROM miembro_grupo mg
     JOIN usuario u ON u.id_usuario = mg.id_usuario
     WHERE mg.id_grupo = ?`,
        [id_grupo]
    );

    const [transacciones] = await poolBD.execute(
        `SELECT t.*, COALESCE(u.nombre, 'Usuario eliminado') AS nombre_pagador
     FROM transaccion t
     LEFT JOIN usuario u ON u.id_usuario = t.id_pagador
     WHERE t.id_grupo = ?
     ORDER BY t.fecha_creacion DESC`,
        [id_grupo]
    );

    // Participantes agrupados por transacción (para balances en front)
    const [participantes] = await poolBD.execute(
        `SELECT pt.id_transaccion, pt.id_usuario, pt.monto_debe, pt.pagado, pt.fecha_pago, COALESCE(u.nombre, 'Usuario eliminado') AS usuario_nombre
     FROM participante_transaccion pt
     LEFT JOIN usuario u ON u.id_usuario = pt.id_usuario
     JOIN transaccion t ON t.id_transaccion = pt.id_transaccion
     WHERE t.id_grupo = ?`,
        [id_grupo]
    );

    const mapP = new Map();
    for (const p of participantes) {
        const key = String(p.id_transaccion);
        if (!mapP.has(key)) mapP.set(key, []);
        mapP.get(key).push({
            id_usuario: p.id_usuario,
            usuario_nombre: p.usuario_nombre,
            monto_debe: Number(p.monto_debe),
            pagado: !!p.pagado,
            fecha_pago: p.fecha_pago
        });
    }

    const uploadedIds = new Set(readdirSync(uploadsDir).map(f => f.split(".")[0]));

    const transaccionesConParticipantes = transacciones.map(t => ({
        ...t,
        participantes: mapP.get(String(t.id_transaccion)) || [],
        tiene_imagen: uploadedIds.has(String(t.id_transaccion))
    }));

    res.json({ grupo, miembros, transacciones: transaccionesConParticipantes });
}));

// Añadir miembro offline (crea usuario virtual sin cuenta)
app.post("/api/grupos/:id_grupo/miembros/offline", ah(async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: "El nombre es obligatorio" });

    // Crear usuario offline (sin email ni contraseña)
    const nombreLimpio = nombre.trim();
    const usernameUnico = `offline_${id_grupo}_${Date.now()}`;

    const [r] = await poolBD.execute(
        "INSERT INTO usuario (nombre, nombre_usuario, correo_electronico, hash_contrasena, offline) VALUES (?,?,NULL,'',1)",
        [nombreLimpio, usernameUnico]
    );
    const id_usuario = r.insertId;

    // Añadir directamente al grupo (sin invitación)
    await poolBD.execute(
        "INSERT IGNORE INTO miembro_grupo (id_grupo, id_usuario, rol) VALUES (?,?,'miembro')",
        [id_grupo, id_usuario]
    );

    await insertarLog(id_grupo, id_usuario, "miembro_añadido", `"${nombreLimpio}" añadido como participante offline`);

    res.status(201).json({ id_usuario, nombre: nombreLimpio, username: usernameUnico, offline: true });
}));

// Editar grupo (solo admin)
app.put("/api/grupos/:id_grupo", ah(async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);
    const { nombre, descripcion, divisa, id_usuario } = req.body;

    const [[grupo]] = await poolBD.execute(
        "SELECT id_admin FROM grupo WHERE id_grupo = ?",
        [id_grupo]
    );
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });
    if (Number(grupo.id_admin) !== Number(id_usuario)) {
        return res.status(403).json({ error: "Solo el admin puede editar el grupo" });
    }

    await poolBD.execute(
        "UPDATE grupo SET nombre = ?, descripcion = ?, divisa = ? WHERE id_grupo = ?",
        [nombre, descripcion || null, divisa, id_grupo]
    );
    res.json({ ok: true });
}));

// Eliminar grupo (solo admin)
app.delete("/api/grupos/:id_grupo", ah(async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);
    const { id_usuario } = req.body;

    const [[grupo]] = await poolBD.execute(
        "SELECT id_admin FROM grupo WHERE id_grupo = ?",
        [id_grupo]
    );

    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });
    if (Number(grupo.id_admin) !== Number(id_usuario)) {
        return res.status(403).json({ error: "Solo el admin puede eliminar el grupo" });
    }

    // Eliminar en cascada: participantes, transacciones, notificaciones, miembros, grupo
    await poolBD.execute(
        "DELETE pt FROM participante_transaccion pt JOIN transaccion t ON pt.id_transaccion = t.id_transaccion WHERE t.id_grupo = ?",
        [id_grupo]
    );
    await poolBD.execute("DELETE FROM transaccion WHERE id_grupo = ?", [id_grupo]);
    await poolBD.execute("DELETE FROM miembro_grupo WHERE id_grupo = ?", [id_grupo]);
    await poolBD.execute("DELETE FROM grupo WHERE id_grupo = ?", [id_grupo]);

    res.json({ ok: true });
}));

// Eliminar miembro del grupo (admin o el mismo usuario)
// GET log de actividad de un grupo
app.get("/api/grupos/:id_grupo/log", ah(async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);
    const [logs] = await poolBD.execute(
        `SELECT l.id_log, l.id_usuario, l.tipo_accion, l.descripcion, l.fecha,
                COALESCE(u.nombre, 'Usuario eliminado') AS nombre_usuario
         FROM log_grupo l
         LEFT JOIN usuario u ON u.id_usuario = l.id_usuario
         WHERE l.id_grupo = ?
         ORDER BY l.fecha DESC`,
        [id_grupo]
    );
    res.json(logs);
}));

app.delete("/api/grupos/:id_grupo/miembros/:id_usuario", ah(async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);
    const id_usuario_eliminar = Number(req.params.id_usuario);
    const { id_usuario_solicitante } = req.body;

    const [[grupo]] = await poolBD.execute(
        "SELECT id_admin FROM grupo WHERE id_grupo = ?",
        [id_grupo]
    );

    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

    const esAdmin = Number(grupo.id_admin) === Number(id_usuario_solicitante);
    const esMismoUsuario = Number(id_usuario_eliminar) === Number(id_usuario_solicitante);

    if (!esAdmin && !esMismoUsuario) {
        return res.status(403).json({ error: "Sin permisos" });
    }

    if (Number(id_usuario_eliminar) === Number(grupo.id_admin)) {
        return res.status(400).json({ error: "El admin no puede salir del grupo. Debe eliminarlo o transferir el rol." });
    }

    await poolBD.execute(
        "DELETE FROM miembro_grupo WHERE id_grupo = ? AND id_usuario = ?",
        [id_grupo, id_usuario_eliminar]
    );

    const [[eliminado]] = await poolBD.execute("SELECT nombre FROM usuario WHERE id_usuario = ?", [id_usuario_eliminar]);
    const accion = esMismoUsuario ? "miembro_salió" : "miembro_eliminado";
    const desc = esMismoUsuario
        ? `${eliminado?.nombre} abandonó el grupo`
        : `${eliminado?.nombre} fue eliminado del grupo`;
    await insertarLog(id_grupo, Number(id_usuario_solicitante), accion, desc);

    res.json({ ok: true });
}));

/* =========================
   TRANSACCIONES
========================= */

// Crear transacción + participantes
app.post("/api/transacciones", ah(async (req, res) => {
    const { id_grupo, tipo, concepto, monto, id_pagador, id_receptor, participantes } = req.body;

    if (!id_grupo || !tipo || !concepto || monto == null || !id_pagador) {
        return res.status(400).json({ error: "Faltan campos" });
    }

    const [r] = await poolBD.execute(
        `INSERT INTO transaccion (id_grupo, tipo, estado, concepto, monto, id_pagador, id_receptor)
     VALUES (?,?,?,?,?,?,?)`,
        [
            Number(id_grupo),
            tipo,
            "pendiente",
            concepto,
            Number(monto),
            Number(id_pagador),
            id_receptor ? Number(id_receptor) : null
        ]
    );

    const id_transaccion = r.insertId;

    // Insertar participantes (si vienen)
    if (Array.isArray(participantes)) {
        for (const p of participantes) {
            await poolBD.execute(
                `INSERT INTO participante_transaccion (id_transaccion, id_usuario, monto_debe, pagado, fecha_pago)
         VALUES (?,?,?,?,?)`,
                [
                    id_transaccion,
                    Number(p.id_usuario),
                    Number(p.monto_debe ?? 0),
                    !!p.pagado,
                    p.pagado ? new Date() : null
                ]
            );
        }
    }

    // Notificaciones básicas para el grupo (a todos menos al pagador)
    const [miembros] = await poolBD.execute(
        "SELECT id_usuario FROM miembro_grupo WHERE id_grupo = ?",
        [Number(id_grupo)]
    );

    const [[pagador]] = await poolBD.execute(
        "SELECT nombre FROM usuario WHERE id_usuario = ?",
        [Number(id_pagador)]
    );

    const partePorPersona = participantes.length > 0 ? (Number(monto) / participantes.length).toFixed(2) : null;

    for (const m of miembros) {
        if (Number(m.id_usuario) === Number(id_pagador)) continue;
        await insertarNotificacion(m.id_usuario, `[gasto] ${pagador?.nombre || "Alguien"} añadió "${concepto}" por €${monto}`, "gasto");
    }

    // Notificación de deuda para cada participante (excepto el pagador)
    for (const part of participantes) {
        const id_part = part?.id_usuario ?? part;
        if (Number(id_part) === Number(id_pagador)) continue;
        await insertarNotificacion(Number(id_part), `[deuda] Debes €${partePorPersona} a ${pagador?.nombre || "alguien"} por "${concepto}"`, "deuda");
    }

    await insertarLog(Number(id_grupo), Number(id_pagador), "gasto_creado", `${pagador?.nombre} añadió el gasto "${concepto}" por ${monto}`);

    res.status(201).json({ id_transaccion });
}));

// Transacciones visibles para un usuario (por pertenecer a sus grupos)
app.get("/api/transacciones", ah(async (req, res) => {
    const id_usuario = Number(req.query.id_usuario);
    if (!id_usuario) return res.status(400).json({ error: "id_usuario requerido" });

    const [tx] = await poolBD.execute(
        `SELECT t.*, g.nombre AS nombre_grupo, u.nombre AS nombre_pagador,
            COALESCE(pt.pagado, 0) AS yo_pague
         FROM transaccion t
         JOIN grupo g ON g.id_grupo = t.id_grupo
         JOIN usuario u ON u.id_usuario = t.id_pagador
         LEFT JOIN participante_transaccion pt
            ON pt.id_transaccion = t.id_transaccion AND pt.id_usuario = ?
         WHERE (t.id_pagador = ? OR pt.id_usuario = ?)
         ORDER BY t.fecha_creacion DESC`,
        [id_usuario, id_usuario, id_usuario]
    );
    res.json(tx);
}));

// Marcar participante como pagado y completar si todos pagaron
app.patch("/api/transacciones/:id_transaccion/participantes/:id_usuario", ah(async (req, res) => {
    const id_transaccion = Number(req.params.id_transaccion);
    const id_usuario = Number(req.params.id_usuario);
    const { pagado } = req.body;

    await poolBD.execute(
        `UPDATE participante_transaccion
     SET pagado = ?, fecha_pago = CASE WHEN ? THEN CURRENT_TIMESTAMP(3) ELSE NULL END
     WHERE id_transaccion = ? AND id_usuario = ?`,
        [!!pagado, !!pagado, id_transaccion, id_usuario]
    );

    const [pend] = await poolBD.execute(
        `SELECT COUNT(*) AS pendientes
     FROM participante_transaccion
     WHERE id_transaccion = ? AND pagado = FALSE`,
        [id_transaccion]
    );

    if (pend[0].pendientes === 0) {
        await poolBD.execute(
            "UPDATE transaccion SET estado = 'completada' WHERE id_transaccion = ?",
            [id_transaccion]
        );
    }

    if (pagado) {
        const [[tx]] = await poolBD.execute(
            "SELECT t.concepto, t.id_grupo FROM transaccion t WHERE t.id_transaccion = ?",
            [id_transaccion]
        );
        const [[u]] = await poolBD.execute("SELECT nombre FROM usuario WHERE id_usuario = ?", [id_usuario]);
        if (tx && u) await insertarLog(tx.id_grupo, id_usuario, "pago_marcado", `${u.nombre} marcó su parte de "${tx.concepto}" como pagada`);
    }

    res.json({ ok: true });
}));

// Actualizar transacción
app.put("/api/transacciones/:id_transaccion", ah(async (req, res) => {
    try {
        const id_transaccion = Number(req.params.id_transaccion);
        const { concepto, monto, id_pagador, participantes, fecha_transaccion } = req.body;

        // Verificar que la transacción existe y guardar valores anteriores
        const [[transaccion]] = await poolBD.execute(
            "SELECT id_transaccion, id_grupo, concepto, monto, id_pagador, fecha_transaccion FROM transaccion WHERE id_transaccion = ?",
            [id_transaccion]
        );

        if (!transaccion) {
            return res.status(404).json({ error: "Transacción no encontrada" });
        }

        // Actualizar los campos de la transacción
        const updates = [];
        const values = [];

        if (concepto !== undefined) {
            updates.push("concepto = ?");
            values.push(concepto);
        }
        if (monto !== undefined) {
            updates.push("monto = ?");
            values.push(Number(monto));
        }
        if (id_pagador !== undefined) {
            updates.push("id_pagador = ?");
            values.push(Number(id_pagador));
        }
        if (fecha_transaccion !== undefined) {
            updates.push("fecha_transaccion = ?");
            values.push(fecha_transaccion ? new Date(fecha_transaccion) : null);
        }

        if (updates.length > 0) {
            values.push(id_transaccion);
            await poolBD.execute(
                `UPDATE transaccion SET ${updates.join(", ")} WHERE id_transaccion = ?`,
                values
            );
        }

        // Si se proveen participantes, actualizar la tabla participante_transaccion
        if (Array.isArray(participantes)) {
            // Eliminar participantes antiguos
            await poolBD.execute(
                "DELETE FROM participante_transaccion WHERE id_transaccion = ?",
                [id_transaccion]
            );

            // Insertar nuevos participantes
            for (const p of participantes) {
                await poolBD.execute(
                    `INSERT INTO participante_transaccion (id_transaccion, id_usuario, monto_debe, pagado, fecha_pago)
                     VALUES (?,?,?,?,?)`,
                    [
                        id_transaccion,
                        Number(p.id_usuario),
                        Number(p.monto_debe ?? 0),
                        !!p.pagado,
                        p.pagado ? new Date() : null
                    ]
                );
            }
        }

        const [[tx2]] = await poolBD.execute("SELECT id_grupo, concepto FROM transaccion WHERE id_transaccion = ?", [id_transaccion]);
        if (tx2 && id_pagador) {
            const [[editor]] = await poolBD.execute("SELECT nombre FROM usuario WHERE id_usuario = ?", [Number(id_pagador)]);
            const cambios = [];

            const oldConcepto = transaccion.concepto ?? '';
            const newConcepto = concepto ?? '';
            if (newConcepto.trim() !== oldConcepto.trim())
                cambios.push(`nombre: "${oldConcepto}" → "${newConcepto}"`);

            const oldMonto = parseFloat(transaccion.monto ?? 0);
            const newMonto = parseFloat(monto ?? 0);
            if (Math.abs(newMonto - oldMonto) > 0.001)
                cambios.push(`importe: €${oldMonto.toFixed(2)} → €${newMonto.toFixed(2)}`);

            const oldFecha = transaccion.fecha_transaccion
                ? new Date(transaccion.fecha_transaccion).toISOString().slice(0, 10) : null;
            const newFecha = fecha_transaccion ? String(fecha_transaccion).slice(0, 10) : null;
            if (oldFecha !== newFecha)
                cambios.push(`fecha: ${oldFecha ?? '—'} → ${newFecha ?? '—'}`);

            const oldPagador = Number(transaccion.id_pagador);
            const newPagador = Number(id_pagador);
            if (oldPagador !== newPagador) {
                const [[oldPag]] = await poolBD.execute("SELECT nombre FROM usuario WHERE id_usuario = ?", [oldPagador]);
                cambios.push(`pagador: ${oldPag?.nombre ?? '?'} → ${editor?.nombre ?? '?'}`);
            }

            console.log('[gasto_editado] cambios:', cambios, '| old:', { concepto: transaccion.concepto, monto: transaccion.monto, fecha: transaccion.fecha_transaccion, id_pagador: transaccion.id_pagador }, '| new:', { concepto, monto, fecha_transaccion, id_pagador });

            const detalle = cambios.length > 0 ? ` (${cambios.join('; ')})` : '';
            await insertarLog(tx2.id_grupo, Number(id_pagador), "gasto_editado", `${editor?.nombre} editó "${tx2.concepto}"${detalle}`);
        }

        res.json({ ok: true, id_transaccion });
    } catch (error) {
        console.error("Error al actualizar transacción:", error);
        res.status(500).json({ error: "Error al actualizar la transacción: " + error.message });
    }
}));

// Eliminar transacción (solo el pagador o el admin del grupo)
app.delete("/api/transacciones/:id_transaccion", ah(async (req, res) => {
    const id_transaccion = Number(req.params.id_transaccion);
    const id_usuario = Number(req.query.id_usuario || req.body?.id_usuario);
    console.log('[DELETE transaccion]', { id_transaccion, id_usuario });

    if (!id_usuario) return res.status(400).json({ error: "id_usuario requerido" });

    const [[tx]] = await poolBD.execute(
        `SELECT t.id_pagador, t.concepto, t.id_grupo, g.id_admin
         FROM transaccion t
         JOIN grupo g ON g.id_grupo = t.id_grupo
         WHERE t.id_transaccion = ?`,
        [id_transaccion]
    );

    if (!tx) return res.status(404).json({ error: "Transacción no encontrada" });

    const esPagador = Number(tx.id_pagador) === Number(id_usuario);
    const esAdmin   = Number(tx.id_admin)   === Number(id_usuario);
    if (!esPagador && !esAdmin) {
        return res.status(403).json({ error: "Solo el pagador o el administrador pueden eliminar esta transacción" });
    }

    await poolBD.execute("DELETE FROM participante_transaccion WHERE id_transaccion = ?", [id_transaccion]);
    await poolBD.execute("DELETE FROM transaccion WHERE id_transaccion = ?", [id_transaccion]);

    const [[actor]] = await poolBD.execute("SELECT nombre FROM usuario WHERE id_usuario = ?", [Number(id_usuario)]);
    await insertarLog(tx.id_grupo, Number(id_usuario), "gasto_eliminado", `${actor?.nombre} eliminó el gasto "${tx.concepto}"`);

    res.json({ ok: true });
}));

// Subir imagen de una transacción
app.post("/api/transacciones/:id/imagen", upload.single("imagen"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió ninguna imagen" });
    res.json({ ok: true });
});

// Obtener imagen de una transacción
app.get("/api/transacciones/:id/imagen", (req, res) => {
    const id = req.params.id;
    const files = readdirSync(uploadsDir);
    const file = files.find(f => f.startsWith(id + "."));
    if (!file) return res.status(404).json({ error: "No hay imagen para esta transacción" });
    res.sendFile(join(uploadsDir, file));
});

/* =========================
   NOTIFICACIONES
========================= */

app.get("/api/notificaciones", ah(async (req, res) => {
    const id_usuario = Number(req.query.id_usuario);
    if (!id_usuario) return res.status(400).json({ error: "id_usuario requerido" });

    const [notifs] = await poolBD.execute(
        `SELECT * FROM notificacion
     WHERE id_usuario = ?
     ORDER BY fecha_creacion DESC`,
        [id_usuario]
    );
    res.json(notifs);
}));

app.patch("/api/notificaciones/:id_notificacion", ah(async (req, res) => {
    const id_notificacion = Number(req.params.id_notificacion);
    await poolBD.execute(
        "UPDATE notificacion SET leida = TRUE WHERE id_notificacion = ?",
        [id_notificacion]
    );
    res.json({ ok: true });
}));

// Middleware global de errores
app.use((err, req, res, next) => {
    console.error("[ERROR]", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
});

// Evitar que el proceso muera por promesas no capturadas
process.on("unhandledRejection", (err) => {
    console.error("[unhandledRejection]", err?.message || err);
});

// Migraciones al arrancar
poolBD.execute(`ALTER TABLE notificacion ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'gasto'`)
    .catch(err => console.warn("[migración] tipo en notificacion:", err.message));

poolBD.execute(`
    CREATE TABLE IF NOT EXISTS invitacion_grupo (
        id_invitacion INT AUTO_INCREMENT PRIMARY KEY,
        id_grupo INT NOT NULL,
        id_usuario INT NOT NULL,
        id_invitador INT NOT NULL,
        estado ENUM('pendiente','aceptada','rechazada') DEFAULT 'pendiente',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_inv (id_grupo, id_usuario, estado)
    )
`).catch(err => console.warn("[migración] invitacion_grupo:", err.message));

poolBD.execute(`ALTER TABLE grupo ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'clasico'`)
    .catch(err => console.warn("[migración] tipo en grupo:", err.message));

poolBD.execute(`ALTER TABLE usuario ADD COLUMN IF NOT EXISTS offline TINYINT(1) DEFAULT 0`)
    .catch(err => console.warn("[migración] offline en usuario:", err.message));

poolBD.execute(`ALTER TABLE usuario MODIFY COLUMN correo_electronico VARCHAR(255) NULL`)
    .catch(err => console.warn("[migración] correo_electronico nullable:", err.message));

app.listen(PUERTO, () => {
    console.log(`API escuchando en http://localhost:${PUERTO}`);
});
