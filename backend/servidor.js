// servidor.js - API Node/Express + MySQL/MariaDB (XAMPP)
import express from "express";
import cors from "cors";
import { poolBD } from "./bd.js";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const PUERTO = Number(process.env.PUERTO || 3000);

// (Mantiene el comportamiento de tu front anterior: btoa(password))
function base64(texto) {
    return Buffer.from(String(texto), "utf8").toString("base64");
}

// Healthcheck
app.get("/api/health", async (req, res) => {
    const [r] = await poolBD.execute("SELECT 1 AS ok");
    res.json(r[0]);
});

/* =========================
   AUTH
========================= */

// Registro
app.post("/api/usuarios", async (req, res) => {
    const { nombre, correo_electronico, contrasena } = req.body;

    if (!nombre || !correo_electronico || !contrasena) {
        return res.status(400).json({ error: "Faltan campos" });
    }

    const [existe] = await poolBD.execute(
        "SELECT id_usuario FROM usuario WHERE correo_electronico = ?",
        [correo_electronico]
    );

    if (existe.length) {
        return res.status(409).json({ error: "El email ya está registrado" });
    }

    const hash = base64(contrasena);

    const [r] = await poolBD.execute(
        "INSERT INTO usuario (nombre, correo_electronico, hash_contrasena) VALUES (?,?,?)",
        [nombre, correo_electronico, hash]
    );

    res.status(201).json({ id_usuario: r.insertId });
});

// Login
app.post("/api/login", async (req, res) => {
    const { correo_electronico, contrasena } = req.body;

    if (!correo_electronico || !contrasena) {
        return res.status(400).json({ error: "Faltan campos" });
    }

    const [filas] = await poolBD.execute(
        "SELECT id_usuario, nombre, correo_electronico, hash_contrasena FROM usuario WHERE correo_electronico = ?",
        [correo_electronico]
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
        correo_electronico: u.correo_electronico
    });
});

/* =========================
   GRUPOS
========================= */

// Listar grupos de un usuario
app.get("/api/grupos", async (req, res) => {
    const id_usuario = Number(req.query.id_usuario);
    if (!id_usuario) return res.status(400).json({ error: "id_usuario requerido" });

    const [grupos] = await poolBD.execute(
        `SELECT g.id_grupo, g.nombre, g.descripcion, g.id_admin, g.fecha_creacion
     FROM grupo g
     JOIN miembro_grupo mg ON mg.id_grupo = g.id_grupo
     WHERE mg.id_usuario = ?
     ORDER BY g.fecha_creacion DESC`,
        [id_usuario]
    );

    res.json(grupos);
});

// Crear grupo + insertar admin en miembro_grupo
app.post("/api/grupos", async (req, res) => {
    const { nombre, descripcion, id_admin } = req.body;
    if (!nombre || !id_admin) return res.status(400).json({ error: "Faltan campos" });

    const [r] = await poolBD.execute(
        "INSERT INTO grupo (nombre, descripcion, id_admin) VALUES (?,?,?)",
        [nombre, descripcion || null, Number(id_admin)]
    );

    await poolBD.execute(
        "INSERT INTO miembro_grupo (id_grupo, id_usuario, rol) VALUES (?,?, 'admin')",
        [r.insertId, Number(id_admin)]
    );

    res.status(201).json({ id_grupo: r.insertId });
});

// Añadir miembros a un grupo por correo (si existen usuarios)
app.post("/api/grupos/:id_grupo/miembros", async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);
    const { correos } = req.body;

    if (!id_grupo) return res.status(400).json({ error: "id_grupo inválido" });
    if (!Array.isArray(correos)) return res.status(400).json({ error: "correos debe ser array" });

    for (const correo of correos) {
        const [u] = await poolBD.execute(
            "SELECT id_usuario FROM usuario WHERE correo_electronico = ?",
            [correo]
        );

        if (!u.length) continue;

        // IGNORE evita duplicados si ya era miembro
        await poolBD.execute(
            "INSERT IGNORE INTO miembro_grupo (id_grupo, id_usuario, rol) VALUES (?,?, 'miembro')",
            [id_grupo, u[0].id_usuario]
        );
    }

    res.json({ ok: true });
});

// Detalle de grupo (grupo + miembros + transacciones + participantes por transacción)
app.get("/api/grupos/:id_grupo", async (req, res) => {
    const id_grupo = Number(req.params.id_grupo);

    const [[grupo]] = await poolBD.execute("SELECT * FROM grupo WHERE id_grupo = ?", [id_grupo]);
    if (!grupo) return res.status(404).json({ error: "Grupo no encontrado" });

    const [miembros] = await poolBD.execute(
        `SELECT u.id_usuario, u.nombre, u.correo_electronico, mg.rol
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

    const transaccionesConParticipantes = transacciones.map(t => ({
        ...t,
        participantes: mapP.get(String(t.id_transaccion)) || []
    }));

    res.json({ grupo, miembros, transacciones: transaccionesConParticipantes });
});

/* =========================
   TRANSACCIONES
========================= */

// Crear transacción + participantes
app.post("/api/transacciones", async (req, res) => {
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
});

// Transacciones visibles para un usuario (por pertenecer a sus grupos)
app.get("/api/transacciones", async (req, res) => {
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
});

// Marcar participante como pagado y completar si todos pagaron
app.patch("/api/transacciones/:id_transaccion/participantes/:id_usuario", async (req, res) => {
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
});

/* =========================
   NOTIFICACIONES
========================= */

app.get("/api/notificaciones", async (req, res) => {
    const id_usuario = Number(req.query.id_usuario);
    if (!id_usuario) return res.status(400).json({ error: "id_usuario requerido" });

    const [notifs] = await poolBD.execute(
        `SELECT * FROM notificacion
     WHERE id_usuario = ?
     ORDER BY fecha_creacion DESC`,
        [id_usuario]
    );

    res.json(notifs);
});

app.patch("/api/notificaciones/:id_notificacion", async (req, res) => {
    const id_notificacion = Number(req.params.id_notificacion);

    await poolBD.execute(
        "UPDATE notificacion SET leida = TRUE WHERE id_notificacion = ?",
        [id_notificacion]
    );

    res.json({ ok: true });
});

app.listen(PUERTO, () => {
    console.log(`API escuchando en http://localhost:${PUERTO}`);
});
