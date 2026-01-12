// grupos.js - Gestión de grupos (API Node/Express + MySQL)

class GruposManager {
    constructor() {
        this.grupos = [];              // cache (ya no localStorage) [file:108]
        this.detalles = new Map();     // id_grupo -> { grupo, miembros, transacciones }
    }

    async cargarGruposUsuario(idUsuario) {
        const resp = await fetch(`${API_URL}/grupos?id_usuario=${encodeURIComponent(idUsuario)}`);
        if (!resp.ok) throw new Error("No se pudieron cargar los grupos");

        this.grupos = await resp.json();

        // Normaliza a estructura parecida a la antigua (id/adminId/fechaCreacion)
        return this.grupos.map(g => ({
            id: String(g.id_grupo),
            nombre: g.nombre,
            descripcion: g.descripcion,
            adminId: String(g.id_admin),
            fechaCreacion: g.fecha_creacion
        }));
    }

    async crearGrupo(nombre, descripcion, miembrosEmails) {
        const currentUser = authManager.getCurrentUser();

        const resp = await fetch(`${API_URL}/grupos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre,
                descripcion,
                id_admin: Number(currentUser.id)
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "No se pudo crear el grupo");
        }

        const data = await resp.json();
        const id_grupo = data.id_grupo;

        // Añadir miembros por correo (si existen en BD). Tu JS antes usaba getUserByEmail sobre localStorage. [file:108][file:110]
        const correos = (miembrosEmails || []).map(e => e.trim()).filter(Boolean);
        if (correos.length) {
            await fetch(`${API_URL}/grupos/${id_grupo}/miembros`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correos })
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
            adminId: String(d.grupo.id_admin),
            fechaCreacion: d.grupo.fecha_creacion,
            miembros: (d.miembros || []).map(m => ({
                id: String(m.id_usuario),
                nombre: m.nombre,
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
                fecha: t.fecha_creacion,
                participantes: [] // si quieres, se puede ampliar con endpoint de participantes
            }))
        };
    }

    calcularBalances(idGrupo) {
        const grupo = this.obtenerGrupo(idGrupo);
        if (!grupo) return {};

        const balances = {};
        grupo.miembros.forEach(m => { balances[m.id] = 0; });

        // Nota: para balances exactos se necesitaría también traer participantes de cada gasto.
        // Aquí replica tu lógica pero solo funcionará 100% si el backend devuelve participantes. [file:8]
        grupo.transacciones.forEach(t => {
            if (t.tipo === "gasto") {
                balances[t.pagadorId] += t.monto;
                // Sin participantes no se puede repartir; requiere endpoint adicional.
            } else if (t.tipo === "pago" && t.estado === "completada" && t.receptorId) {
                balances[t.pagadorId] -= t.monto;
                balances[t.receptorId] += t.monto;
            }
        });

        return balances;
    }
}

const gruposManager = new GruposManager();
