// transacciones.js - Gestión de transacciones
class TransaccionesManager {
    constructor() {
        this.grupos = gruposManager.grupos;
    }

    crearTransaccion(grupoId, concepto, monto, tipo, participantes) {
        const currentUser = authManager.getCurrentUser();
        const grupo = gruposManager.obtenerGrupo(grupoId);

        if (!grupo) {
            throw new Error('Grupo no encontrado');
        }

        const nuevaTransaccion = {
            id: Date.now().toString(),
            grupoId,
            pagadorId: currentUser.id,
            pagadorNombre: currentUser.nombre,
            concepto,
            monto: parseFloat(monto),
            tipo,
            participantes: participantes || [],
            estado: 'pendiente',
            fecha: new Date().toISOString()
        };

        // Si es gasto y se divide equitativamente
        if (tipo === 'gasto' && participantes.length === 0) {
            const montoPorPersona = nuevaTransaccion.monto / grupo.miembros.length;
            nuevaTransaccion.participantes = grupo.miembros.map(m => ({
                usuarioId: m.id,
                usuarioNombre: m.nombre,
                montoDebe: montoPorPersona,
                pagado: m.id === currentUser.id
            }));
        }

        grupo.transacciones.push(nuevaTransaccion);
        gruposManager.saveGrupos();

        // Crear notificaciones
        grupo.miembros.forEach(m => {
            if (m.id !== currentUser.id) {
                notificationsManager.crearNotificacion(
                    m.id,
                    `${currentUser.nombre} añadió "${concepto}" por €${monto} en "${grupo.nombre}"`
                );
            }
        });

        return nuevaTransaccion;
    }

    obtenerTransaccionesUsuario(userId) {
        const transacciones = [];

        this.grupos.forEach(grupo => {
            if (grupo.miembros.some(m => m.id === userId)) {
                grupo.transacciones.forEach(t => {
                    transacciones.push({
                        ...t,
                        grupoNombre: grupo.nombre
                    });
                });
            }
        });

        return transacciones.sort((a, b) =>
            new Date(b.fecha) - new Date(a.fecha)
        );
    }

    marcarComoPagada(grupoId, transaccionId, participanteId) {
        const grupo = gruposManager.obtenerGrupo(grupoId);
        const transaccion = grupo.transacciones.find(t => t.id === transaccionId);

        if (transaccion) {
            const participante = transaccion.participantes.find(p => p.usuarioId === participanteId);
            if (participante) {
                participante.pagado = true;

                // Verificar si todos han pagado
                const todosPagados = transaccion.participantes.every(p => p.pagado);
                if (todosPagados) {
                    transaccion.estado = 'completada';
                }

                gruposManager.saveGrupos();
            }
        }
    }
}

const transaccionesManager = new TransaccionesManager();

// Agregar al final de transacciones.js
class NotificationsManager {
    constructor() {
        this.notificaciones = this.loadNotificaciones();
    }

    loadNotificaciones() {
        const notifs = localStorage.getItem('notificaciones');
        return notifs ? JSON.parse(notifs) : [];
    }

    saveNotificaciones() {
        localStorage.setItem('notificaciones', JSON.stringify(this.notificaciones));
    }

    crearNotificacion(usuarioId, mensaje) {
        const nuevaNotif = {
            id: Date.now().toString(),
            usuarioId,
            mensaje,
            leida: false,
            fecha: new Date().toISOString()
        };

        this.notificaciones.push(nuevaNotif);
        this.saveNotificaciones();
    }

    obtenerNotificacionesUsuario(usuarioId) {
        return this.notificaciones
            .filter(n => n.usuarioId === usuarioId)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    marcarComoLeida(notifId) {
        const notif = this.notificaciones.find(n => n.id === notifId);
        if (notif) {
            notif.leida = true;
            this.saveNotificaciones();
        }
    }

    contarNoLeidas(usuarioId) {
        return this.notificaciones.filter(n =>
            n.usuarioId === usuarioId && !n.leida
        ).length;
    }
}

const notificationsManager = new NotificationsManager();
