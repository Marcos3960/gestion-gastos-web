// app.js - Aplicación principal
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Verificar autenticación
    if (authManager.isAuthenticated()) {
        showScreen('appScreen');
        loadApp();
    } else {
        showScreen('loginScreen');
    }

    // Event Listeners de autenticación
    setupAuthListeners();
    setupAppListeners();
}

function setupAuthListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            authManager.login(email, password);
            showScreen('appScreen');
            loadApp();
        } catch (error) {
            alert(error.message);
        }
    });

    // Registro
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            authManager.register(nombre, email, password);
            authManager.login(email, password);
            showScreen('appScreen');
            loadApp();
        } catch (error) {
            alert(error.message);
        }
    });

    // Cambiar entre login y registro
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('registerScreen');
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('loginScreen');
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        authManager.logout();
        showScreen('loginScreen');
    });
}

function setupAppListeners() {
    // Navegación
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);

            // Actualizar botones activos
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Notificaciones
    document.getElementById('notificationsBtn').addEventListener('click', () => {
        document.getElementById('notificationsPanel').classList.add('active');
        loadNotificaciones();
    });

    document.getElementById('closeNotifications').addEventListener('click', () => {
        document.getElementById('notificationsPanel').classList.remove('active');
    });

    // Crear grupo
    document.getElementById('btnCrearGrupo').addEventListener('click', () => {
        openModal('modalCrearGrupo');
    });

    document.getElementById('formCrearGrupo').addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombreGrupo').value;
        const descripcion = document.getElementById('descripcionGrupo').value;
        const miembrosText = document.getElementById('miembrosGrupo').value;
        const miembros = miembrosText.split(',').map(e => e.trim()).filter(e => e);

        try {
            gruposManager.crearGrupo(nombre, descripcion, miembros);
            closeModal('modalCrearGrupo');
            loadGrupos();
            e.target.reset();
        } catch (error) {
            alert(error.message);
        }
    });

    // Nueva transacción
    document.getElementById('btnNuevaTransaccion').addEventListener('click', () => {
        loadGruposEnSelect();
        openModal('modalNuevaTransaccion');
    });

    document.getElementById('formNuevaTransaccion').addEventListener('submit', (e) => {
        e.preventDefault();
        const grupoId = document.getElementById('grupoTransaccion').value;
        const concepto = document.getElementById('conceptoTransaccion').value;
        const monto = document.getElementById('montoTransaccion').value;
        const tipo = document.getElementById('tipoTransaccion').value;

        try {
            transaccionesManager.crearTransaccion(grupoId, concepto, monto, tipo, []);
            closeModal('modalNuevaTransaccion');
            loadTransacciones();
            e.target.reset();
        } catch (error) {
            alert(error.message);
        }
    });

    // Filtros de transacciones
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadTransacciones(tab.dataset.filter);
        });
    });

    // Cerrar modales
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.dataset.close);
        });
    });

    // Back to grupos
    document.getElementById('btnBackToGrupos').addEventListener('click', () => {
        switchView('grupos');
    });
}

function loadApp() {
    loadGrupos();
    loadTransacciones();
    updateNotificationBadge();
}

function loadGrupos() {
    const currentUser = authManager.getCurrentUser();
    const grupos = gruposManager.obtenerGruposUsuario(currentUser.id);
    const container = document.getElementById('gruposList');

    if (grupos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No tienes grupos</h3>
                <p>Crea un grupo para empezar a gestionar gastos</p>
            </div>
        `;
        return;
    }

    container.innerHTML = grupos.map(grupo => {
        const numTransacciones = grupo.transacciones.length;
        const numMiembros = grupo.miembros.length;
        const balances = gruposManager.calcularBalances(grupo.id);
        const miBalance = balances[currentUser.id] || 0;

        return `
            <div class="grupo-card" onclick="verDetalleGrupo('${grupo.id}')">
                <div class="grupo-card-header">
                    <div>
                        <h3>${grupo.nombre}</h3>
                        <p>${grupo.descripcion || 'Sin descripción'}</p>
                    </div>
                </div>
                <div class="grupo-stats">
                    <div class="stat">
                        <div class="stat-value">${numMiembros}</div>
                        <div class="stat-label">Miembros</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${numTransacciones}</div>
                        <div class="stat-label">Transacciones</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value ${miBalance > 0 ? 'positivo' : miBalance < 0 ? 'negativo' : ''}">
                            €${miBalance.toFixed(2)}
                        </div>
                        <div class="stat-label">Tu balance</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function verDetalleGrupo(grupoId) {
    const grupo = gruposManager.obtenerGrupo(grupoId);
    const currentUser = authManager.getCurrentUser();
    const balances = gruposManager.calcularBalances(grupoId);

    const content = document.getElementById('grupoDetalleContent');
    content.innerHTML = `
        <div class="grupo-detalle-header">
            <h2>${grupo.nombre}</h2>
            <p>${grupo.descripcion || 'Sin descripción'}</p>
            <div class="grupo-stats">
                <div class="stat">
                    <div class="stat-value">${grupo.miembros.length}</div>
                    <div class="stat-label">Miembros</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${grupo.transacciones.length}</div>
                    <div class="stat-label">Transacciones</div>
                </div>
            </div>
        </div>

        <h3 style="margin: 24px 0 16px;">Balances de Miembros</h3>
        <div class="miembros-list">
            ${grupo.miembros.map(m => {
        const balance = balances[m.id] || 0;
        const clase = balance > 0 ? 'positivo' : balance < 0 ? 'negativo' : 'neutro';
        return `
                    <div class="miembro-card">
                        <h4>${m.nombre}${m.id === currentUser.id ? ' (Tú)' : ''}</h4>
                        <div class="balance ${clase}">€${balance.toFixed(2)}</div>
                        <small>${balance > 0 ? 'Le deben' : balance < 0 ? 'Debe' : 'Sin deudas'}</small>
                    </div>
                `;
    }).join('')}
        </div>

        <h3 style="margin: 24px 0 16px;">Transacciones del Grupo</h3>
        <div class="transacciones-list">
            ${grupo.transacciones.length === 0 ?
            '<div class="empty-state"><p>No hay transacciones aún</p></div>' :
            grupo.transacciones.map(t => `
                    <div class="transaccion-card">
                        <div class="transaccion-info">
                            <div class="transaccion-concepto">${t.concepto}</div>
                            <div class="transaccion-detalles">
                                Pagado por ${t.pagadorNombre} • ${new Date(t.fecha).toLocaleDateString()}
                            </div>
                        </div>
                        <div class="transaccion-monto">€${t.monto.toFixed(2)}</div>
                        <span class="transaccion-estado estado-${t.estado}">
                            ${t.estado === 'pendiente' ? 'Pendiente' : 'Completada'}
                        </span>
                    </div>
                `).join('')
        }
        </div>
    `;

    switchView('grupoDetalle');
}

function loadTransacciones(filtro = 'todas') {
    const currentUser = authManager.getCurrentUser();
    let transacciones = transaccionesManager.obtenerTransaccionesUsuario(currentUser.id);

    // Aplicar filtro
    if (filtro === 'pendientes') {
        transacciones = transacciones.filter(t => t.estado === 'pendiente');
    } else if (filtro === 'completadas') {
        transacciones = transacciones.filter(t => t.estado === 'completada');
    }

    const container = document.getElementById('transaccionesList');

    if (transacciones.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <h3>No hay transacciones</h3>
                <p>Crea una nueva transacción para empezar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = transacciones.map(t => `
        <div class="transaccion-card">
            <div class="transaccion-info">
                <div class="transaccion-concepto">${t.concepto}</div>
                <div class="transaccion-detalles">
                    ${t.grupoNombre} • Pagado por ${t.pagadorNombre} • ${new Date(t.fecha).toLocaleDateString()}
                </div>
            </div>
            <div class="transaccion-monto">€${t.monto.toFixed(2)}</div>
            <span class="transaccion-estado estado-${t.estado}">
                ${t.estado === 'pendiente' ? 'Pendiente' : 'Completada'}
            </span>
        </div>
    `).join('');
}

function loadNotificaciones() {
    const currentUser = authManager.getCurrentUser();
    const notificaciones = notificationsManager.obtenerNotificacionesUsuario(currentUser.id);
    const container = document.getElementById('notificationsList');

    if (notificaciones.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No tienes notificaciones</p></div>';
        return;
    }

    container.innerHTML = notificaciones.map(n => `
        <div class="notification-item ${n.leida ? '' : 'unread'}" 
             onclick="marcarNotificacionLeida('${n.id}')">
            <p>${n.mensaje}</p>
            <div class="notification-time">${formatearFecha(n.fecha)}</div>
        </div>
    `).join('');
}

function marcarNotificacionLeida(notifId) {
    notificationsManager.marcarComoLeida(notifId);
    loadNotificaciones();
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const currentUser = authManager.getCurrentUser();
    const count = notificationsManager.contarNoLeidas(currentUser.id);
    const badge = document.getElementById('notificationBadge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function loadGruposEnSelect() {
    const currentUser = authManager.getCurrentUser();
    const grupos = gruposManager.obtenerGruposUsuario(currentUser.id);
    const select = document.getElementById('grupoTransaccion');

    select.innerHTML = '<option value="">Selecciona un grupo</option>' +
        grupos.map(g => `<option value="${g.id}">${g.nombre}</option>`).join('');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewName + 'View').classList.add('active');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function formatearFecha(fecha) {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora - date;
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} h`;
    if (dias < 7) return `Hace ${dias} d`;
    return date.toLocaleDateString();
}

// Hacer funciones globales para onclick
window.verDetalleGrupo = verDetalleGrupo;
window.marcarNotificacionLeida = marcarNotificacionLeida;
