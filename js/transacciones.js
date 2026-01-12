// transacciones.js - Gestión de transacciones + notificaciones (API Node/Express + MySQL)
class TransaccionesManager {
    constructor() { }

    async crearTransaccion(grupoId, concepto, monto, tipo, participantes) {
        const currentUser = authManager.getCurrentUser();
        const gid = Number(grupoId);

        // Si no te pasan participantes y es gasto "equitativo", tu JS original repartía entre miembros del grupo. [file:109]
        // Para replicarlo, necesitamos el detalle del grupo (miembros).
        let participantesFinal = participantes || [];

        if (tipo === "gasto" && (!participantesFinal || participantesFinal.length === 0)) {
            // Cargar miembros del grupo para calcular reparto
            const detalle = await gruposManager.cargarDetalleGrupo(grupoId);
            const miembros = detalle.miembros || [];

            const montoPorPersona = Number(monto) / (miembros.length || 1);

            participantesFinal = miembros.map(m => ({
                id_usuario: Number(m.id_usuario),
                monto_debe: montoPorPersona,
                pagado: Number(m.id_usuario) === Number(currentUser.id)
            }));
        } else {
            // Normaliza formato si te llega como {usuarioId, montoDebe, pagado}
            participantesFinal = participantesFinal.map(p => ({
                id_usuario: Number(p.id_usuario ?? p.usuarioId),
                monto_debe: Number(p.monto_debe ?? p.montoDebe ?? 0),
                pagado: !!p.pagado
            }));
        }

        const resp = await fetch(`${API_URL}/transacciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_grupo: gid,
                tipo,
                concepto,
                monto: Number(monto),
                id_pagador: Number(currentUser.id),
                id_receptor: null,
                participantes: participantesFinal
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "No se pudo crear la transacción");
        }

        return await resp.json(); // {id_transaccion}
    }

    async obtenerTransaccionesUsuario(userId) {
        const resp = await fetch(`${API_URL}/transacciones?id_usuario=${encodeURIComponent(userId)}`);
        if (!resp.ok) throw new Error("No se pudieron cargar transacciones");

        const tx = await resp.json();

        // Normaliza a tu estructura usada en app.js (grupoNombre, pagadorNombre, fecha...) [file:107]
        return tx.map(t => ({
            id: String(t.id_transaccion),
            grupoId: String(t.id_grupo),
            grupoNombre: t.nombre_grupo,
            pagadorId: String(t.id_pagador),
            pagadorNombre: t.nombre_pagador,
            concepto: t.concepto,
            monto: Number(t.monto),
            tipo: t.tipo,
            estado: t.estado,
            fecha: t.fecha_creacion
        }));
    }

    async marcarComoPagada(grupoId, transaccionId, participanteId) {
        const resp = await fetch(
            `${API_URL}/transacciones/${encodeURIComponent(transaccionId)}/participantes/${encodeURIComponent(participanteId)}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pagado: true })
            }
        );

        if (!resp.ok) throw new Error("No se pudo marcar como pagada");
        return await resp.json();
    }
}

const transaccionesManager = new TransaccionesManager();

class NotificationsManager {
    constructor() { }

    async obtenerNotificacionesUsuario(usuarioId) {
        const resp = await fetch(`${API_URL}/notificaciones?id_usuario=${encodeURIComponent(usuarioId)}`);
        if (!resp.ok) throw new Error("No se pudieron cargar notificaciones");

        const notifs = await resp.json();

        // Normaliza a tu estructura usada en app.js [file:107]
        return notifs.map(n => ({
            id: String(n.id_notificacion),
            usuarioId: String(n.id_usuario),
            mensaje: n.mensaje,
            leida: !!n.leida,
            fecha: n.fecha_creacion
        }));
    }

    async marcarComoLeida(notifId) {
        const resp = await fetch(`${API_URL}/notificaciones/${encodeURIComponent(notifId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });

        if (!resp.ok) throw new Error("No se pudo marcar la notificación como leída");
        return await resp.json();
    }

    async contarNoLeidas(usuarioId) {
        const notifs = await this.obtenerNotificacionesUsuario(usuarioId);
        return notifs.filter(n => !n.leida).length;
    }
}

const notificationsManager = new NotificationsManager();
