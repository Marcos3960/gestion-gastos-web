// grupos.js - Gestión de grupos
class GruposManager {
    constructor() {
        this.grupos = this.loadGrupos();
    }

    loadGrupos() {
        const grupos = localStorage.getItem('grupos');
        return grupos ? JSON.parse(grupos) : [];
    }

    saveGrupos() {
        localStorage.setItem('grupos', JSON.stringify(this.grupos));
    }

    crearGrupo(nombre, descripcion, miembrosEmails) {
        const currentUser = authManager.getCurrentUser();

        // Validar y obtener miembros
        const miembros = [currentUser];
        miembrosEmails.forEach(email => {
            if (email && email !== currentUser.email) {
                const user = authManager.getUserByEmail(email);
                if (user) {
                    miembros.push(user);
                }
            }
        });

        const nuevoGrupo = {
            id: Date.now().toString(),
            nombre,
            descripcion,
            miembros: miembros.map(m => ({ id: m.id, nombre: m.nombre, email: m.email })),
            adminId: currentUser.id,
            fechaCreacion: new Date().toISOString(),
            transacciones: []
        };

        this.grupos.push(nuevoGrupo);
        this.saveGrupos();

        // Crear notificación para miembros
        miembros.forEach(m => {
            if (m.id !== currentUser.id) {
                notificationsManager.crearNotificacion(
                    m.id,
                    `${currentUser.nombre} te ha añadido al grupo "${nombre}"`
                );
            }
        });

        return nuevoGrupo;
    }

    obtenerGruposUsuario(userId) {
        return this.grupos.filter(g =>
            g.miembros.some(m => m.id === userId)
        );
    }

    obtenerGrupo(grupoId) {
        return this.grupos.find(g => g.id === grupoId);
    }

    calcularBalances(grupoId) {
        const grupo = this.obtenerGrupo(grupoId);
        if (!grupo) return {};

        const balances = {};
        grupo.miembros.forEach(m => {
            balances[m.id] = 0;
        });

        grupo.transacciones.forEach(t => {
            if (t.tipo === 'gasto') {
                // El pagador recibe
                balances[t.pagadorId] += t.monto;

                // Los participantes deben
                t.participantes.forEach(p => {
                    balances[p.usuarioId] -= p.montoDebe;
                });
            } else if (t.tipo === 'pago' && t.estado === 'completada') {
                // Ajustar por pagos realizados
                balances[t.pagadorId] -= t.monto;
                balances[t.receptorId] += t.monto;
            }
        });

        return balances;
    }
}

const gruposManager = new GruposManager();
