// grupos.js - Gestión de grupos (API Node/Express + MySQL)


class GruposManager {
    constructor() {
        this.grupos = [];
        this.detalles = new Map();
    }

    async cargarGruposUsuario(idUsuario) {
        const resp = await fetch(`${API_URL}/grupos?id_usuario=${encodeURIComponent(idUsuario)}`);
        if (!resp.ok) throw new Error("No se pudieron cargar los grupos");
        this.grupos = await resp.json();
        return this.grupos.map(g => ({
            id: String(g.id_grupo),
            nombre: g.nombre,
            descripcion: g.descripcion,
            divisa: g.divisa || 'EUR',
            adminId: String(g.id_admin),
            fechaCreacion: g.fecha_creacion
        }));
    }

    async crearGrupo(nombre, descripcion, divisa, miembrosIds) {
        const currentUser = authManager.getCurrentUser();
        const resp = await fetch(`${API_URL}/grupos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre,
                descripcion,
                divisa: divisa || 'EUR',
                id_admin: Number(currentUser.id)
            })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "No se pudo crear el grupo");
        }

        const data = await resp.json();
        const id_grupo = data.id_grupo;

        // Añadir miembros por ID
        const ids = (miembrosIds || []).map(id => Number(id)).filter(Boolean);
        if (ids.length) {
            await fetch(`${API_URL}/grupos/${id_grupo}/miembros`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuarios_ids: ids })
            });
        }

        return String(id_grupo);
    }

    async cargarDetalleGrupo(idGrupo) {
        const resp = await fetch(`${API_URL}/grupos/${encodeURIComponent(idGrupo)}`);
        if (!resp.ok) throw new Error("No se pudo cargar el detalle del grupo");
        const detalle = await resp.json();
        this.detalles.set(String(idGrupo), detalle);
        return detalle;
    }

    obtenerGrupo(idGrupo) {
        const d = this.detalles.get(String(idGrupo));
        if (!d) return null;
        return {
            id: String(d.grupo.id_grupo),
            nombre: d.grupo.nombre,
            descripcion: d.grupo.descripcion,
            divisa: d.grupo.divisa || 'EUR',
            adminId: String(d.grupo.id_admin),
            fechaCreacion: d.grupo.fecha_creacion,
            miembros: (d.miembros || []).map(m => ({
                id: String(m.id_usuario),
                nombre: m.nombre,
                nombreUsuario: m.nombre_usuario,
                email: m.correo_electronico,
                rol: m.rol
            })),
            transacciones: (d.transacciones || []).map(t => ({
                id: String(t.id_transaccion),
                grupoId: String(t.id_grupo),
                tipo: t.tipo,
                estado: t.estado,
                concepto: t.concepto,
                monto: Number(t.monto),
                pagadorId: String(t.id_pagador),
                pagadorNombre: t.nombre_pagador,
                receptorId: t.id_receptor ? String(t.id_receptor) : null,
                fecha: t.fecha_transaccion || t.fecha_creacion,
                participantes: t.participantes || []
            }))
        };
    }

    calcularBalances(idGrupo) {
        const grupo = this.obtenerGrupo(idGrupo);
        if (!grupo) return {};

        const balances = {};
        grupo.miembros.forEach(m => { balances[m.id] = 0; });

        grupo.transacciones.forEach(t => {
            if (t.tipo === "gasto") {
                // El pagador adelantó el dinero
                balances[t.pagadorId] = (balances[t.pagadorId] || 0) + t.monto;

                // Cada participante debe su parte
                if (t.participantes && t.participantes.length > 0) {
                    t.participantes.forEach(p => {
                        balances[String(p.id_usuario)] = (balances[String(p.id_usuario)] || 0) - p.monto_debe;
                    });
                }
            } else if (t.tipo === "pago" && t.estado === "completada" && t.receptorId) {
                balances[t.pagadorId] = (balances[t.pagadorId] || 0) - t.monto;
                balances[t.receptorId] = (balances[t.receptorId] || 0) + t.monto;
            }
        });

        return balances;
    }

    async eliminarGrupo(idGrupo, idUsuario) {
        const resp = await fetch(`${API_URL}/grupos/${encodeURIComponent(idGrupo)}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_usuario: Number(idUsuario) })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "No se pudo eliminar el grupo");
        }
        return await resp.json();
    }

    async eliminarMiembro(idGrupo, idUsuarioEliminar, idUsuarioSolicitante) {
        const resp = await fetch(
            `${API_URL}/grupos/${encodeURIComponent(idGrupo)}/miembros/${encodeURIComponent(idUsuarioEliminar)}`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_usuario_solicitante: Number(idUsuarioSolicitante) })
            }
        );
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "No se pudo eliminar al miembro");
        }
        return await resp.json();
    }
}

const gruposManager = new GruposManager();
