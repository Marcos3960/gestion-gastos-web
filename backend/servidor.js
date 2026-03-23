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
        `SELECT g.id_grupo, g.nombre, g.descripcion, g.divisa, g.id_admin, g.fecha_creacion
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
    const { nombre, descripcion, divisa, id_admin } = req.body;
    if (!nombre || !id_admin) return res.status(400).json({ error: "Faltan campos" });

    const [r] = await poolBD.execute(
        "INSERT INTO grupo (nombre, descripcion, divisa, id_admin) VALUES (?,?,?,?)",
        [nombre, descripcion || null, divisa || 'EUR', Number(id_admin)]
    );

    await poolBD.execute(
        "INSERT INTO miembro_grupo (id_grupo, id_usuario, rol) VALUES (?,?, 'admin')",
        [r.insertId, Number(id_admin)]
    );

    res.status(201).json({ id_grupo: r.insertId });
}));

// Añadir miembros a un grupo por ID de usuario
app.post("/api/grupos/:id_grupo/miembros", ah(async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);
    const { usuarios_ids } = req.body;

    if (!id_grupo) return res.status(400).json({ error: "id_grupo inválido" });
    if (!Array.isArray(usuarios_ids)) return res.status(400).json({ error: "usuarios_ids debe ser array" });

    for (const id_usuario of usuarios_ids) {
        // IGNORE evita duplicados si ya era miembro
        await poolBD.execute(
            "INSERT IGNORE INTO miembro_grupo (id_grupo, id_usuario, rol) VALUES (?,?, 'miembro')",
            [id_grupo, Number(id_usuario)]
        );
    }

    res.json({ ok: true });
}));

// Detalle de grupo (grupo + miembros + transacciones + participantes por transacción)
app.get("/api/grupos/:id_grupo", ah(async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);

    const [[grupo]] = await poolBD.execute("SELECT * FROM grupo WHERE id_grupo = ?", [id_grupo]);
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

    const [miembros] = await poolBD.execute(
        `SELECT u.id_usuario, u.nombre, u.nombre_usuario, u.correo_electronico, mg.rol
     FROM miembro_grupo mg
     JOIN usuario u ON u.id_usuario = mg.id_usuario
     WHERE mg.id_grupo = ?`,
        [id_grupo]
    );

    const [transacciones] = await poolBD.execute(
        `SELECT t.*, u.nombre AS nombre_pagador
     FROM transaccion t
     JOIN usuario u ON u.id_usuario = t.id_pagador
     WHERE t.id_grupo = ?
     ORDER BY t.fecha_creacion DESC`,
        [id_grupo]
    );

    // Participantes agrupados por transacción (para balances en front)
    const [participantes] = await poolBD.execute(
        `SELECT pt.id_transaccion, pt.id_usuario, pt.monto_debe, pt.pagado, pt.fecha_pago, u.nombre AS usuario_nombre
     FROM participante_transaccion pt
     JOIN usuario u ON u.id_usuario = pt.id_usuario
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

    for (const m of miembros) {
        if (Number(m.id_usuario) === Number(id_pagador)) continue;
        await poolBD.execute(
            "INSERT INTO notificacion (id_usuario, mensaje) VALUES (?,?)",
            [m.id_usuario, `${pagador?.nombre || "Alguien"} añadió "${concepto}" por €${monto}`]
        );
    }

    res.status(201).json({ id_transaccion });
}));

// Transacciones visibles para un usuario (por pertenecer a sus grupos)
app.get("/api/transacciones", ah(async (req, res) => {
    const id_usuario = Number(req.query.id_usuario);
    if (!id_usuario) return res.status(400).json({ error: "id_usuario requerido" });

    const [tx] = await poolBD.execute(
        `SELECT t.*, g.nombre AS nombre_grupo, u.nombre AS nombre_pagador
     FROM transaccion t
     JOIN grupo g ON g.id_grupo = t.id_grupo
     JOIN miembro_grupo mg ON mg.id_grupo = t.id_grupo
     JOIN usuario u ON u.id_usuario = t.id_pagador
     WHERE mg.id_usuario = ?
     ORDER BY t.fecha_creacion DESC`,
        [id_usuario]
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

    res.json({ ok: true });
}));

// Actualizar transacción
app.put("/api/transacciones/:id_transaccion", ah(async (req, res) => {
    try {
        const id_transaccion = Number(req.params.id_transaccion);
        const { concepto, monto, id_pagador, participantes } = req.body;

        console.log("Actualizando transacción:", id_transaccion, req.body);

        // Verificar que la transacción existe
        const [[transaccion]] = await poolBD.execute(
            "SELECT id_transaccion, id_grupo FROM transaccion WHERE id_transaccion = ?",
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

        res.json({ ok: true, id_transaccion });
    } catch (error) {
        console.error("Error al actualizar transacción:", error);
        res.status(500).json({ error: "Error al actualizar la transacción: " + error.message });
    }
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

app.listen(PUERTO, () => {
    console.log(`API escuchando en http://localhost:${PUERTO}`);
});
