// app.js - Aplicación principal (API Node/Express + MySQL)



document.addEventListener("DOMContentLoaded", () => {
  initApp();
});


function initApp() {
  // Cargar tema guardado
  loadTheme();

  if (authManager.isAuthenticated()) {
    showScreen("appScreen");
    loadApp();
  } else {
    showScreen("loginScreen");
  }
  setupAuthListeners();
  setupAppListeners();
}

/* =========================
   TEMA OSCURO
========================= */
function loadTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.checked = theme === "dark";
  }
}


function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}


/* =========================
   AUTH LISTENERS
========================= */
function setupAuthListeners() {
  // Login
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const identifier = document.getElementById("loginIdentifier").value;
    const password = document.getElementById("loginPassword").value;
    try {
      await authManager.login(identifier, password);
      showScreen("appScreen");
      await loadApp();
    } catch (error) {
      showPopup(error.message, "error");
    }
  });


  // Registro
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("registerName").value;
    const nombreUsuario = document.getElementById("registerUsername").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    try {
      await authManager.register(nombre, nombreUsuario, email, password);
      await authManager.login(email, password);
      showScreen("appScreen");
      await loadApp();
    } catch (error) {
      showPopup(error.message, "error");
    }
  });


  // Cambiar entre login y registro
  document.getElementById("showRegister").addEventListener("click", (e) => {
    e.preventDefault();
    showScreen("registerScreen");
  });


  document.getElementById("showLogin").addEventListener("click", (e) => {
    e.preventDefault();
    showScreen("loginScreen");
  });


  // Logout
  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    authManager.logout();
    // Recargar la página para limpiar todos los datos
    window.location.reload();
  });


}


/* =========================
   APP LISTENERS
========================= */
function setupAppListeners() {
  // Theme toggle
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("change", toggleTheme);
  }


  // Logout desde ajustes
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    authManager.logout();
    showScreen("loginScreen");
    document.getElementById("loginIdentifier").value = "";
    document.getElementById("loginPassword").value = "";
  });


  // Editar perfil
  document.getElementById("btnEditarPerfil")?.addEventListener("click", () => {
    openModal("modalEditarPerfil");
    const user = authManager.getCurrentUser();
    document.getElementById("editNombre").value = user.nombre;
    document.getElementById("editNombreUsuario").value = user.nombreUsuario || "";
    document.getElementById("editEmail").value = user.email;
    document.getElementById("editPassword").value = "";
    const inputFoto = document.getElementById("editFotoPerfil");
    if (inputFoto) inputFoto.value = "";
  });


  // Editar perfil desde Ajustes
  document.getElementById("btnEditarPerfilSettings")?.addEventListener("click", () => {
    openModal("modalEditarPerfil");
    const user = authManager.getCurrentUser();
    document.getElementById("editNombre").value = user.nombre;
    document.getElementById("editNombreUsuario").value = user.nombreUsuario || "";
    document.getElementById("editEmail").value = user.email;
    document.getElementById("editPassword").value = "";
    const inputFoto = document.getElementById("editFotoPerfil");
    if (inputFoto) inputFoto.value = "";
  });


  // Ver perfil desde Ajustes — eliminado, la info se muestra directamente en la tarjeta


  document.getElementById("formEditarPerfil")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("editNombre").value.trim();
    const nombreUsuario = document.getElementById("editNombreUsuario").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    const password = document.getElementById("editPassword").value.trim();
    const fotoInput = document.getElementById("editFotoPerfil");

    if (!nombre || !nombreUsuario || !email) {
      showPopup("Por favor completa los campos requeridos", "warning");
      return;
    }

    try {
      // Mostrar estado de carga
      const submitBtn = document.querySelector("#formEditarPerfil button[type='submit']");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Guardando...";
      submitBtn.disabled = true;

      await authManager.actualizarPerfil(nombre, nombreUsuario, email, password || null);

      if (fotoInput?.files && fotoInput.files.length > 0) {
        const currentUser = authManager.getCurrentUser();
        const formData = new FormData();
        formData.append("imagen", fotoInput.files[0]);
        const respFoto = await fetch(`${API_URL}/usuarios/${encodeURIComponent(currentUser.id)}/foto`, {
          method: "POST",
          body: formData
        });
        if (!respFoto.ok) {
          const err = await respFoto.json().catch(() => ({}));
          throw new Error(err.error || "No se pudo subir la foto de perfil");
        }
      }

      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      showPopup("Perfil actualizado correctamente", "success");
      closeModal("modalEditarPerfil");
      cargarAjustes();
    } catch (error) {
      const submitBtn = document.querySelector("#formEditarPerfil button[type='submit']");
      submitBtn.textContent = "Guardar cambios";
      submitBtn.disabled = false;
      showPopup("Error: " + error.message, "error");
    }
  });


  // Navegación
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const view = btn.getAttribute("data-view");
      switchView(view);
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Cargar estadísticas si es la vista de estadísticas
      if (view === "estadisticas") {
        await loadEstadisticas();
      }

      // Cargar ajustes si es la vista de ajustes
      if (view === "ajustes") {
        cargarAjustes();
      }
    });
  });


  // Notificaciones
  document.getElementById("notificationsBtn").addEventListener("click", async () => {
    document.getElementById("notificationsPanel").classList.add("active");
    await loadNotificaciones();
  });


  document.getElementById("closeNotifications").addEventListener("click", () => {
    document.getElementById("notificationsPanel").classList.remove("active");
  });


  // Crear grupo
  let miembrosSeleccionadosGlobal = [];
  
  document.getElementById("btnCrearGrupo").addEventListener("click", () => {
    miembrosSeleccionadosGlobal = [];
    document.getElementById("buscarUsuario").value = "";
    document.getElementById("resultadosBusqueda").innerHTML = "";
    document.getElementById("miembrosSeleccionados").innerHTML = "";
    openModal("modalCrearGrupo");
  });

  // Búsqueda de usuarios para crear grupo
  let busquedaTimeout;
  document.getElementById("buscarUsuario").addEventListener("input", async (e) => {
    clearTimeout(busquedaTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      document.getElementById("resultadosBusqueda").innerHTML = "";
      return;
    }

    busquedaTimeout = setTimeout(async () => {
      try {
        const usuarios = await authManager.obtenerTodosUsuarios();
        const currentUser = authManager.getCurrentUser();
        
        const resultados = usuarios.filter(u => 
          String(u.id_usuario) !== currentUser.id &&
          !miembrosSeleccionadosGlobal.find(m => m.id === String(u.id_usuario)) &&
          (u.nombre.toLowerCase().includes(query.toLowerCase()) ||
           (u.nombre_usuario && u.nombre_usuario.toLowerCase().includes(query.toLowerCase())))
        );

        const resultadosDiv = document.getElementById("resultadosBusqueda");
        if (resultados.length === 0) {
          resultadosDiv.innerHTML = '<div class="search-no-results">No se encontraron usuarios</div>';
        } else {
          resultadosDiv.innerHTML = resultados.map(u => `
            <div class="search-result-item" data-id="${u.id_usuario}" data-nombre="${escapeHtml(u.nombre)}" data-username="${escapeHtml(u.nombre_usuario || '')}">
              <div class="search-result-info">
                <strong>${escapeHtml(u.nombre)}</strong>
                <small>@${escapeHtml(u.nombre_usuario || u.correo_electronico)}</small>
              </div>
              <button type="button" class="btn-add-user">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          `).join('');

          // Añadir eventos a los botones
          resultadosDiv.querySelectorAll('.btn-add-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const item = e.target.closest('.search-result-item');
              agregarMiembro({
                id: item.dataset.id,
                nombre: item.dataset.nombre,
                username: item.dataset.username
              });
              item.remove();
              if (resultadosDiv.children.length === 0) {
                resultadosDiv.innerHTML = '';
              }
            });
          });
        }
      } catch (error) {
        console.error("Error buscando usuarios:", error);
      }
    }, 300);
  });

  function agregarMiembro(usuario) {
    miembrosSeleccionadosGlobal.push(usuario);
    actualizarMiembrosSeleccionados();
  }

  function quitarMiembro(id) {
    miembrosSeleccionadosGlobal = miembrosSeleccionadosGlobal.filter(m => m.id !== id);
    actualizarMiembrosSeleccionados();
  }

  function actualizarMiembrosSeleccionados() {
    const container = document.getElementById("miembrosSeleccionados");
    if (miembrosSeleccionadosGlobal.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = miembrosSeleccionadosGlobal.map(m => `
      <div class="selected-member">
        <div class="selected-member-info">
          <strong>${escapeHtml(m.nombre)}</strong>
          <small>@${escapeHtml(m.username || '')}</small>
        </div>
        <button type="button" class="btn-remove-user" data-id="${m.id}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-remove-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        quitarMiembro(e.target.closest('.btn-remove-user').dataset.id);
      });
    });
  }

  document.getElementById("formCrearGrupo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("nombreGrupo").value;
    const descripcion = document.getElementById("descripcionGrupo").value;
    const divisa = document.getElementById("divisaGrupo").value;

    const miembrosIds = miembrosSeleccionadosGlobal.map(m => m.id);

    try {
      await gruposManager.crearGrupo(nombre, descripcion, divisa, miembrosIds);
      closeModal("modalCrearGrupo");
      await loadGrupos();
      e.target.reset();
      miembrosSeleccionadosGlobal = [];
    } catch (error) {
      showPopup(error.message, "error");
    }
  });


  // Nueva transacción (se eliminó del dashboard, ahora solo en grupos)
  document.getElementById("btnNuevaTransaccion")?.addEventListener("click", async () => {
    await loadGruposEnSelect();
    openModal("modalNuevaTransaccion");
  });


  // Filtros de transacciones (ya no se usa)
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", async () => {
      document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      await loadTransacciones(tab.dataset.filter);
    });
  });


  // Cerrar modales
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(btn.dataset.close);
    });
  });


  // Back to grupos
  document.getElementById("btnBackToGrupos")?.addEventListener("click", () => {
    switchView("grupos");
  });
}


async function loadApp() {
  await authManager.refrescarUsuario();
  await loadGrupos();
  await updateNotificationBadge();
  cargarAjustes();
}


function cargarAjustes() {
  const usuario = authManager.getCurrentUser();
  const settingsUserName = document.getElementById("settingsUserName");
  const settingsUserEmail = document.getElementById("settingsUserEmail");
  const settingsUserUsername = document.getElementById("settingsUserUsername");
  const profileCardAvatar = document.getElementById("profileCardAvatar");
  const profileCardInitials = document.getElementById("profileCardInitials");
  const initials = usuario?.nombre
    ? usuario.nombre
      .split(" ")
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join("")
    : "?";

  if (settingsUserName) {
    settingsUserName.textContent = usuario?.nombre || "-";
  }
  if (settingsUserUsername) {
    settingsUserUsername.textContent = usuario?.nombreUsuario ? "@" + usuario.nombreUsuario : "-";
  }
  if (settingsUserEmail) {
    settingsUserEmail.textContent = usuario?.email || "-";
  }
  if (profileCardInitials) {
    profileCardInitials.textContent = initials;
  }
  if (profileCardAvatar && usuario?.id) {
    const fotoUrl = `${API_URL}/usuarios/${encodeURIComponent(usuario.id)}/foto?t=${Date.now()}`;
    profileCardAvatar.style.backgroundImage = `url('${fotoUrl}')`;
    profileCardAvatar.classList.add("has-photo");
    if (profileCardInitials) profileCardInitials.style.display = "none";

    const prueba = new Image();
    prueba.onload = () => {
      profileCardAvatar.classList.add("has-photo");
      if (profileCardInitials) profileCardInitials.style.display = "none";
    };
    prueba.onerror = () => {
      profileCardAvatar.classList.remove("has-photo");
      profileCardAvatar.style.backgroundImage = "";
      if (profileCardInitials) profileCardInitials.style.display = "";
    };
    prueba.src = fotoUrl;
  }
}


/* =========================
   GRUPOS
========================= */
async function loadGrupos() {
  const currentUser = authManager.getCurrentUser();
  const grupos = await gruposManager.cargarGruposUsuario(currentUser.id);
  const container = document.getElementById("gruposList");


  if (!grupos || grupos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No tienes grupos</h3>
        <p>Crea un grupo para empezar a gestionar gastos</p>
      </div>
    `;
    return;
  }


  container.innerHTML = grupos.map(grupo => `
    <div class="grupo-card" data-grupo-id="${grupo.id}">
      <div class="grupo-header">
        <h3>${escapeHtml(grupo.nombre)}</h3>
        <span class="grupo-divisa">${escapeHtml(grupo.divisa)}</span>
      </div>
      <p class="grupo-descripcion">${escapeHtml(grupo.descripcion || "Sin descripción")}</p>
      <div class="grupo-footer">
        <span class="grupo-fecha">${formatearFecha(grupo.fechaCreacion)}</span>
      </div>
    </div>
  `).join("");


  // Click en grupo
  document.querySelectorAll(".grupo-card").forEach(card => {
    card.addEventListener("click", () => {
      const grupoId = card.dataset.grupoId;
      verDetalleGrupo(grupoId);
    });
  });
}


async function verDetalleGrupo(grupoId) {
  await gruposManager.cargarDetalleGrupo(grupoId);
  const grupo = gruposManager.obtenerGrupo(grupoId);
  const currentUser = authManager.getCurrentUser();


  if (!grupo) return;


  const esAdmin = grupo.adminId === currentUser.id;


  document.getElementById("detalleGrupoNombre").textContent = grupo.nombre;
  document.getElementById("detalleGrupoDivisa").textContent = grupo.divisa;
  document.getElementById("detalleGrupoDescripcion").textContent = grupo.descripcion || "Sin descripción";


  // Botones de administración
  const actionsContainer = document.getElementById("grupoActions");
  actionsContainer.innerHTML = `
    ${esAdmin ? `
      <button class="btn-secondary" onclick="abrirModalAñadirMiembros('${grupoId}')">
        <i class="fas fa-user-plus"></i> Añadir miembros
      </button>
      <button class="btn-danger" onclick="eliminarGrupo('${grupoId}')">
        <i class="fas fa-trash"></i> Eliminar grupo
      </button>
    ` : `
      <button class="btn-danger" onclick="salirDelGrupo('${grupoId}')">
        <i class="fas fa-sign-out-alt"></i> Salir del grupo
      </button>
    `}
    <button class="btn-primary" onclick="abrirModalTransaccionGrupo('${grupoId}')">
      <i class="fas fa-plus"></i> Añadir gasto
    </button>
  `;


  // Miembros
  const miembrosContainer = document.getElementById("detalleGrupoMiembros");
  miembrosContainer.innerHTML = grupo.miembros.map(m => `
    <div class="miembro-item">
      <div class="miembro-main">
        <div class="miembro-avatar" aria-hidden="true">
          <span class="miembro-avatar-fallback">${escapeHtml(obtenerInicialesNombre(m.nombre))}</span>
          <img
            src="${API_URL}/usuarios/${encodeURIComponent(m.id)}/foto"
            alt="Foto de ${escapeHtml(m.nombre)}"
            loading="lazy"
            onerror="this.remove()"
          >
        </div>
        <div class="miembro-info">
          <strong>${escapeHtml(m.nombre)}</strong>
          ${m.rol === 'admin' ? '<span class="badge-admin">Admin</span>' : ''}
          <br><small>@${escapeHtml(m.nombreUsuario || m.email)}</small>
        </div>
      </div>
      ${(esAdmin && m.id !== grupo.adminId) ? `
        <button class="btn-icon-danger" onclick="eliminarMiembroGrupo('${grupoId}', '${m.id}')" title="Eliminar miembro">
          <i class="fas fa-times"></i>
        </button>
      ` : ''}
    </div>
  `).join("");


  // Balances
  const balances = gruposManager.calcularBalances(grupoId);
  const transaccionesGasto = (grupo.transacciones || []).filter(t => t.tipo === "gasto");
  const gastoTotalGrupo = transaccionesGasto.reduce((acc, t) => acc + Number(t.monto || 0), 0);
  const gastoUsuario = transaccionesGasto.reduce((acc, t) => {
    const parteUsuario = (t.participantes || []).find(
      p => String(p.id_usuario) === String(currentUser.id)
    );
    return acc + Number(parteUsuario?.monto_debe || 0);
  }, 0);

  const balancesContainer = document.getElementById("detalleGrupoBalances");
  balancesContainer.innerHTML = `
    <div class="balance-stats-row">
      <div class="balance-stat-card">
        <span class="balance-stat-label">Gasto total</span>
        <span class="balance-stat-value">${gastoTotalGrupo.toFixed(2)} ${grupo.divisa}</span>
      </div>
      <div class="balance-stat-card">
        <span class="balance-stat-label">Tu gasto</span>
        <span class="balance-stat-value">${gastoUsuario.toFixed(2)} ${grupo.divisa}</span>
      </div>
    </div>
    ${Object.entries(balances).map(([userId, balance]) => {
      const miembro = grupo.miembros.find(m => m.id === userId);
      const balanceClass = balance > 0 ? "balance-positivo" : balance < 0 ? "balance-negativo" : "balance-neutro";
      return `
        <div class="balance-item ${balanceClass}">
          <span>${escapeHtml(miembro?.nombre || "Usuario")}</span>
          <span class="balance-monto">${balance.toFixed(2)} ${grupo.divisa}</span>
        </div>
      `;
    }).join("")}
  `;


  // Transacciones
  const transaccionesContainer = document.getElementById("detalleGrupoTransacciones");
  if (!grupo.transacciones || grupo.transacciones.length === 0) {
    transaccionesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-receipt"></i>
        <p>No hay transacciones aún</p>
        <p>Crea una nueva transacción para empezar</p>
      </div>
    `;
  } else {
    transaccionesContainer.innerHTML = grupo.transacciones.map(t => `
      <div class="transaccion-item">
        <div class="transaccion-icon ${t.tipo}">
          <i class="fas fa-${t.tipo === 'gasto' ? 'shopping-cart' : 'exchange-alt'}"></i>
        </div>
        <div class="transaccion-content">
          <div class="transaccion-header-row">
            <div class="transaccion-info">
              <strong class="transaccion-concepto">${escapeHtml(t.concepto)}</strong>
              <small class="transaccion-meta">Pagado por ${escapeHtml(t.pagadorNombre)} - ${formatearFecha(t.fecha)}</small>
            </div>
            <div class="transaccion-monto ${t.tipo}">
              ${t.monto.toFixed(2)} ${grupo.divisa}
            </div>
          </div>
          ${(t.participantes && t.participantes.length > 0) || t.tieneImagen || esAdmin ? `
            <div class="transaccion-bottom">
              ${t.participantes && t.participantes.length > 0 ? `
                <div class="participantes-list">
                  ${t.participantes.map(p => `
                    <span class="participante ${p.pagado ? 'pagado' : 'pendiente'}">
                      ${escapeHtml(p.usuario_nombre)}: ${p.monto_debe.toFixed(2)} ${grupo.divisa}
                      ${p.pagado ? '<i class="fas fa-check"></i>' :
                        (esAdmin || String(p.id_usuario) === currentUser.id ?
                          `<button class="btn-mark-paid" onclick="marcarComoPagado('${grupoId}', '${t.id}', '${p.id_usuario}')" title="Marcar como pagado">
                            <i class="fas fa-check-circle"></i>
                          </button>` : ''
                        )
                      }
                    </span>
                  `).join('')}
                </div>
              ` : ''}
              <div class="transaccion-actions">
                ${t.tieneImagen ? `
                  <button class="btn-ver-imagen" onclick="verImagenTransaccion('${t.id}')" title="Ver imagen del ticket">
                    <i class="fas fa-image"></i> Ver imagen
                  </button>
                ` : ''}
                ${esAdmin ? `
                  <button class="btn-icon-edit btn-edit-bottom" onclick="abrirModalEditarTransaccion('${grupoId}', '${t.id}')" title="Editar gasto">
                    <i class="fas fa-edit"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `).join("");
  }


  switchView("detalleGrupo");
}


function verImagenTransaccion(transaccionId) {
  const img = document.getElementById("imagenTransaccionViewer");
  img.src = `${API_URL}/transacciones/${transaccionId}/imagen`;
  openModal("modalVerImagen");
}


async function abrirModalTransaccionGrupo(grupoId) {
  // Asegurar que el detalle del grupo esté cargado
  await gruposManager.cargarDetalleGrupo(grupoId);
  const grupo = gruposManager.obtenerGrupo(grupoId);

  if (!grupo) {
    showPopup('No se pudo cargar la información del grupo', "error");
    return;
  }


  const currentUser = authManager.getCurrentUser();
  const esAdmin = grupo.adminId === currentUser.id;


  openModal("modalTransaccionGrupo");


  // Configurar select de pagador (solo si es admin)
  const pagadorContainer = document.getElementById("containerPagador");
  const selectPagador = document.getElementById("pagadorTransaccion");

  if (esAdmin) {
    pagadorContainer.style.display = "block";
    selectPagador.innerHTML = grupo.miembros.map(m =>
      `<option value="${m.id}" ${m.id === currentUser.id ? 'selected' : ''}>${escapeHtml(m.nombre)}</option>`
    ).join("");
  } else {
    pagadorContainer.style.display = "none";
    selectPagador.innerHTML = `<option value="${currentUser.id}">${escapeHtml(currentUser.nombre)}</option>`;
  }


  // Configurar checkboxes de participantes
  const containerParticipantes = document.getElementById("participantesTransaccion");

  if (!grupo.miembros || grupo.miembros.length === 0) {
    containerParticipantes.innerHTML = '<p style="color: var(--text-secondary);">No hay miembros en este grupo</p>';
  } else {
    containerParticipantes.innerHTML = grupo.miembros.map(m =>
      `<label class="checkbox-label">
        <input type="checkbox" name="participante" value="${m.id}" checked>
        <span>${escapeHtml(m.nombre)}</span>
      </label>`
    ).join("");
  }


  // Manejar submit
  const form = document.getElementById("formTransaccionGrupo");
  form.onsubmit = async (e) => {
    e.preventDefault();

    const concepto = document.getElementById("conceptoTransaccionGrupo").value;
    const monto = document.getElementById("montoTransaccionGrupo").value;
    const fecha = document.getElementById("fechaTransaccion").value;
    const pagadorId = selectPagador.value;

    const participantesSeleccionados = Array.from(containerParticipantes.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

    if (participantesSeleccionados.length === 0) {
      showPopup('Debes seleccionar al menos un participante', "warning");
      return;
    }

    const montoPorPersona = Number(monto) / participantesSeleccionados.length;

    const participantes = participantesSeleccionados.map(id => ({
      id_usuario: Number(id),
      monto_debe: montoPorPersona,
      pagado: String(id) === String(pagadorId)
    }));


    try {
      const resultado = await transaccionesManager.crearTransaccion(
        grupoId,
        concepto,
        monto,
        "gasto",
        participantes,
        pagadorId,
        fecha || null
      );

      const imagenInput = document.getElementById("imagenTransaccion");
      if (imagenInput.files && imagenInput.files.length > 0) {
        const formData = new FormData();
        formData.append("imagen", imagenInput.files[0]);
        await fetch(`${API_URL}/transacciones/${resultado.id_transaccion}/imagen`, {
          method: "POST",
          body: formData
        });
      }

      closeModal("modalTransaccionGrupo");
      await verDetalleGrupo(grupoId);
      form.reset();
    } catch (error) {
      showPopup(error.message, "error");
    }
  };
}

async function abrirModalEditarTransaccion(grupoId, transaccionId) {
  // Cargar el detalle del grupo para obtener la transacción
  await gruposManager.cargarDetalleGrupo(grupoId);
  const grupo = gruposManager.obtenerGrupo(grupoId);

  if (!grupo) {
    showPopup('No se pudo cargar la información del grupo', "error");
    return;
  }

  // Buscar la transacción específica
  const transaccion = grupo.transacciones.find(t => t.id === String(transaccionId));
  
  if (!transaccion) {
    showPopup('No se pudo encontrar la transacción', "error");
    return;
  }

  const currentUser = authManager.getCurrentUser();
  const esAdmin = grupo.adminId === currentUser.id;

  openModal("modalEditarTransaccion");

  // Guardar IDs en campos ocultos
  document.getElementById("editTransaccionId").value = transaccionId;
  document.getElementById("editTransaccionGrupoId").value = grupoId;

  // Poblar campos del formulario
  document.getElementById("editConceptoTransaccion").value = transaccion.concepto;
  document.getElementById("editMontoTransaccion").value = transaccion.monto;

  // Convertir fecha a formato datetime-local si existe
  if (transaccion.fecha) {
    const fecha = new Date(transaccion.fecha);
    const fechaLocal = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById("editFechaTransaccion").value = fechaLocal;
  } else {
    document.getElementById("editFechaTransaccion").value = "";
  }

  // Configurar select de pagador (solo si es admin)
  const pagadorContainer = document.getElementById("editContainerPagador");
  const selectPagador = document.getElementById("editPagadorTransaccion");

  if (esAdmin) {
    pagadorContainer.style.display = "block";
    selectPagador.innerHTML = grupo.miembros.map(m =>
      `<option value="${m.id}" ${m.id === transaccion.pagadorId ? 'selected' : ''}>${escapeHtml(m.nombre)}</option>`
    ).join("");
  } else {
    pagadorContainer.style.display = "none";
    selectPagador.innerHTML = `<option value="${transaccion.pagadorId}">${escapeHtml(transaccion.pagadorNombre)}</option>`;
  }

  // Configurar checkboxes de participantes
  const containerParticipantes = document.getElementById("editParticipantesTransaccion");
  
  if (!grupo.miembros || grupo.miembros.length === 0) {
    containerParticipantes.innerHTML = '<p style="color: var(--text-secondary);">No hay miembros en este grupo</p>';
  } else {
    // IDs de participantes actuales
    const participantesIds = (transaccion.participantes || []).map(p => String(p.id_usuario));
    
    containerParticipantes.innerHTML = grupo.miembros.map(m =>
      `<label class="checkbox-label">
        <input type="checkbox" name="participante" value="${m.id}" ${participantesIds.includes(String(m.id)) ? 'checked' : ''}>
        <span>${escapeHtml(m.nombre)}</span>
      </label>`
    ).join("");
  }

  // Manejar submit
  const form = document.getElementById("formEditarTransaccion");
  
  // Remover event listener anterior si existe
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  newForm.onsubmit = async (e) => {
    e.preventDefault();

    // Leer IDs de los campos ocultos
    const transaccionIdActual = document.getElementById("editTransaccionId").value;
    const grupoIdActual = document.getElementById("editTransaccionGrupoId").value;

    const concepto = document.getElementById("editConceptoTransaccion").value;
    const monto = document.getElementById("editMontoTransaccion").value;
    const fecha = document.getElementById("editFechaTransaccion").value;
    const pagadorId = document.getElementById("editPagadorTransaccion").value;

    const participantesSeleccionados = Array.from(
      document.getElementById("editParticipantesTransaccion").querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => cb.value);

    if (participantesSeleccionados.length === 0) {
      showPopup('Debes seleccionar al menos un participante', "warning");
      return;
    }

    const montoPorPersona = Number(monto) / participantesSeleccionados.length;

    const participantes = participantesSeleccionados.map(id => ({
      id_usuario: Number(id),
      monto_debe: montoPorPersona,
      pagado: String(id) === String(pagadorId)
    }));

    try {
      await transaccionesManager.actualizarTransaccion(
        transaccionIdActual,
        concepto,
        monto,
        pagadorId,
        participantes,
        fecha || null
      );
      closeModal("modalEditarTransaccion");
      await verDetalleGrupo(grupoIdActual);
      showPopup('Gasto actualizado correctamente', "success");
    } catch (error) {
      showPopup('Error al actualizar: ' + error.message, "error");
    }
  };
}

let miembrosSeleccionadosGrupoGlobal = [];
let grupoIdActualAñadirMiembros = null;

async function abrirModalAñadirMiembros(grupoId) {
  grupoIdActualAñadirMiembros = grupoId;
  miembrosSeleccionadosGrupoGlobal = [];
  document.getElementById("buscarUsuarioGrupo").value = "";
  document.getElementById("resultadosBusquedaGrupo").innerHTML = "";
  document.getElementById("miembrosSeleccionadosGrupo").innerHTML = "";
  openModal("modalAñadirMiembros");
}

// Búsqueda de usuarios para añadir a grupo existente
let busquedaGrupoTimeout;
document.getElementById("buscarUsuarioGrupo").addEventListener("input", async (e) => {
  clearTimeout(busquedaGrupoTimeout);
  const query = e.target.value.trim();
  
  if (query.length < 2) {
    document.getElementById("resultadosBusquedaGrupo").innerHTML = "";
    return;
  }

  busquedaGrupoTimeout = setTimeout(async () => {
    try {
      const usuarios = await authManager.obtenerTodosUsuarios();
      const grupo = gruposManager.obtenerGrupo(grupoIdActualAñadirMiembros);
      const miembrosActualesIds = grupo.miembros.map(m => m.id);
      
      const resultados = usuarios.filter(u => 
        !miembrosActualesIds.includes(String(u.id_usuario)) &&
        !miembrosSeleccionadosGrupoGlobal.find(m => m.id === String(u.id_usuario)) &&
        (u.nombre.toLowerCase().includes(query.toLowerCase()) ||
         (u.nombre_usuario && u.nombre_usuario.toLowerCase().includes(query.toLowerCase())))
      );

      const resultadosDiv = document.getElementById("resultadosBusquedaGrupo");
      if (resultados.length === 0) {
        resultadosDiv.innerHTML = '<div class="search-no-results">No se encontraron usuarios</div>';
      } else {
        resultadosDiv.innerHTML = resultados.map(u => `
          <div class="search-result-item" data-id="${u.id_usuario}" data-nombre="${escapeHtml(u.nombre)}" data-username="${escapeHtml(u.nombre_usuario || '')}">
            <div class="search-result-info">
              <strong>${escapeHtml(u.nombre)}</strong>
              <small>@${escapeHtml(u.nombre_usuario || u.correo_electronico)}</small>
            </div>
            <button type="button" class="btn-add-user">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        `).join('');

        resultadosDiv.querySelectorAll('.btn-add-user').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const item = e.target.closest('.search-result-item');
            agregarMiembroGrupo({
              id: item.dataset.id,
              nombre: item.dataset.nombre,
              username: item.dataset.username
            });
            item.remove();
            if (resultadosDiv.children.length === 0) {
              resultadosDiv.innerHTML = '';
            }
          });
        });
      }
    } catch (error) {
      console.error("Error buscando usuarios:", error);
    }
  }, 300);
});

function agregarMiembroGrupo(usuario) {
  miembrosSeleccionadosGrupoGlobal.push(usuario);
  actualizarMiembrosSeleccionadosGrupo();
}

function quitarMiembroGrupo(id) {
  miembrosSeleccionadosGrupoGlobal = miembrosSeleccionadosGrupoGlobal.filter(m => m.id !== id);
  actualizarMiembrosSeleccionadosGrupo();
}

function actualizarMiembrosSeleccionadosGrupo() {
  const container = document.getElementById("miembrosSeleccionadosGrupo");
  if (miembrosSeleccionadosGrupoGlobal.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = miembrosSeleccionadosGrupoGlobal.map(m => `
    <div class="selected-member">
      <div class="selected-member-info">
        <strong>${escapeHtml(m.nombre)}</strong>
        <small>@${escapeHtml(m.username || '')}</small>
      </div>
      <button type="button" class="btn-remove-user" data-id="${m.id}">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');

  container.querySelectorAll('.btn-remove-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      quitarMiembroGrupo(e.target.closest('.btn-remove-user').dataset.id);
    });
  });
}

document.getElementById("formAñadirMiembros").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (miembrosSeleccionadosGrupoGlobal.length === 0) {
    showPopup("Debes seleccionar al menos un miembro", "warning");
    return;
  }

  try {
    const miembrosIds = miembrosSeleccionadosGrupoGlobal.map(m => Number(m.id));
    await fetch(`${API_URL}/grupos/${grupoIdActualAñadirMiembros}/miembros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarios_ids: miembrosIds })
    });
    
    closeModal("modalAñadirMiembros");
    await verDetalleGrupo(grupoIdActualAñadirMiembros);
    miembrosSeleccionadosGrupoGlobal = [];
    showPopup("Miembros añadidos correctamente", "success");
  } catch (error) {
    showPopup("Error al añadir miembros: " + error.message, "error");
  }
});

async function marcarComoPagado(grupoId, transaccionId, usuarioId) {
  if (!await showConfirmPopup("¿Confirmar que este pago ha sido realizado?", "Confirmar pago", "primary")) {
    return;
  }

  try {
    await transaccionesManager.marcarComoPagada(grupoId, transaccionId, usuarioId);
    await verDetalleGrupo(grupoId);
    showPopup("Pago marcado como realizado", "success");
  } catch (error) {
    showPopup("Error al marcar como pagado: " + error.message, "error");
  }
}

async function eliminarGrupo(grupoId) {
  if (!await showConfirmPopup("¿Estás seguro de que quieres eliminar este grupo? Esta acción no se puede deshacer.", "Eliminar grupo", "danger")) {
    return;
  }

  const currentUser = authManager.getCurrentUser();
  try {
    await gruposManager.eliminarGrupo(grupoId, currentUser.id);
    showPopup("Grupo eliminado correctamente", "success");
    switchView("grupos");
    await loadGrupos();
  } catch (error) {
    showPopup(error.message, "error");
  }
}


async function salirDelGrupo(grupoId) {
  if (!await showConfirmPopup("¿Estás seguro de que quieres salir de este grupo?", "Salir del grupo", "primary")) {
    return;
  }

  const currentUser = authManager.getCurrentUser();
  try {
    await gruposManager.eliminarMiembro(grupoId, currentUser.id, currentUser.id);
    showPopup("Has salido del grupo correctamente", "success");
    switchView("grupos");
    await loadGrupos();
  } catch (error) {
    showPopup(error.message, "error");
  }
}


async function eliminarMiembroGrupo(grupoId, miembroId) {
  if (!await showConfirmPopup("¿Estás seguro de que quieres eliminar a este miembro del grupo?", "Eliminar miembro", "danger")) {
    return;
  }

  const currentUser = authManager.getCurrentUser();
  try {
    await gruposManager.eliminarMiembro(grupoId, miembroId, currentUser.id);
    showPopup("Miembro eliminado correctamente", "success");
    await verDetalleGrupo(grupoId);
  } catch (error) {
    showPopup(error.message, "error");
  }
}

/* =========================
   USUARIOS SELECT
========================= */
async function cargarUsuariosEnSelect() {
  try {
    const usuarios = await authManager.obtenerTodosUsuarios();
    const currentUser = authManager.getCurrentUser();

    const select = document.getElementById("miembrosGrupoSelect");
    select.innerHTML = usuarios
      .filter(u => String(u.id_usuario) !== currentUser.id)
      .map(u => `<option value="${u.id_usuario}">${escapeHtml(u.nombre)} (${escapeHtml(u.correo_electronico)})</option>`)
      .join("");
  } catch (error) {
    console.error("Error cargando usuarios:", error);
  }
}


async function loadGruposEnSelect() {
  const currentUser = authManager.getCurrentUser();
  const grupos = await gruposManager.cargarGruposUsuario(currentUser.id);

  const select = document.getElementById("grupoTransaccion");
  if (select) {
    select.innerHTML = grupos.map(g =>
      `<option value="${g.id}">${escapeHtml(g.nombre)}</option>`
    ).join("");
  }
}


/* =========================
   TRANSACCIONES (Vista eliminada del dashboard)
========================= */
async function loadTransacciones(filter = "all") {
  // Esta función ya no se usa en la navegación principal
  // Las transacciones solo se ven dentro de cada grupo
}


/* =========================
   NOTIFICACIONES
========================= */
async function loadNotificaciones() {
  const currentUser = authManager.getCurrentUser();
  const notifs = await notificationsManager.obtenerNotificacionesUsuario(currentUser.id);

  const container = document.getElementById("notificationsList");

  if (!notifs || notifs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bell-slash"></i>
        <p>No tienes notificaciones</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notifs.map(n => `
    <div class="notification-item ${n.leida ? 'leida' : 'no-leida'}" data-notif-id="${n.id}">
      <p>${escapeHtml(n.mensaje)}</p>
      <small>${formatearFecha(n.fecha)}</small>
      ${!n.leida ? `<button class="btn-small" onclick="marcarNotificacionLeida('${n.id}')">Marcar como leída</button>` : ''}
    </div>
  `).join("");
}


async function marcarNotificacionLeida(notifId) {
  await notificationsManager.marcarComoLeida(notifId);
  await loadNotificaciones();
  await updateNotificationBadge();
}


async function updateNotificationBadge() {
  const currentUser = authManager.getCurrentUser();
  const count = await notificationsManager.contarNoLeidas(currentUser.id);

  const badge = document.getElementById("notificationBadge");
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}


/* =========================
   UTILIDADES
========================= */
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screenId)?.classList.add("active");
}


function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(viewId)?.classList.add("active");
}


function openModal(modalId) {
  document.getElementById(modalId)?.classList.add("active");
}


function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove("active");
}


function getPopupContainer() {
  let container = document.getElementById("appPopupContainer");
  if (container) return container;

  container = document.createElement("div");
  container.id = "appPopupContainer";
  container.className = "popup-container";
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-atomic", "false");
  document.body.appendChild(container);
  return container;
}


function showPopup(message, type = "info", duration = 3200) {
  const container = getPopupContainer();
  const popup = document.createElement("div");
  popup.className = `app-popup ${type}`;

  const text = document.createElement("span");
  text.className = "app-popup-message";
  text.textContent = String(message || "");

  const closeBtn = document.createElement("button");
  closeBtn.className = "app-popup-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Cerrar notificación");
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => removePopup(popup));

  popup.appendChild(text);
  popup.appendChild(closeBtn);
  container.appendChild(popup);

  requestAnimationFrame(() => popup.classList.add("show"));

  if (duration > 0) {
    setTimeout(() => removePopup(popup), duration);
  }
}


function removePopup(popup) {
  if (!popup || !popup.parentElement) return;
  popup.classList.remove("show");
  setTimeout(() => {
    if (popup.parentElement) {
      popup.parentElement.removeChild(popup);
    }
  }, 220);
}


function showConfirmPopup(message, confirmLabel = "Confirmar", tone = "primary") {
  return new Promise((resolve) => {
    const container = getPopupContainer();
    const popup = document.createElement("div");
    popup.className = "app-popup confirm show";

    const body = document.createElement("div");
    body.className = "app-popup-message";
    body.textContent = String(message || "");

    const actions = document.createElement("div");
    actions.className = "app-popup-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "app-popup-btn cancel";
    cancelBtn.textContent = "Cancelar";

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = `app-popup-btn ${tone === "danger" ? "danger" : "primary"}`;
    confirmBtn.textContent = confirmLabel;

    const close = (result) => {
      removePopup(popup);
      resolve(result);
    };

    cancelBtn.addEventListener("click", () => close(false));
    confirmBtn.addEventListener("click", () => close(true));

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    popup.appendChild(body);
    popup.appendChild(actions);
    container.appendChild(popup);
  });
}


function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}


function obtenerInicialesNombre(nombre) {
  if (!nombre) return "?";
  return String(nombre)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => (parte[0] || "").toUpperCase())
    .join("") || "?";
}


function formatearFecha(fecha) {
  if (!fecha) return "-";
  const d = new Date(fecha);
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


/* =========================
   ESTADÍSTICAS
========================= */
async function loadEstadisticas() {
  const currentUser = authManager.getCurrentUser();
  if (!currentUser) return;


  try {
    // Obtener todas las transacciones del usuario
    const transacciones = await transaccionesManager.obtenerTransaccionesUsuario(currentUser.id);
    
    // Obtener todos los grupos del usuario para calcular balances
    const grupos = await gruposManager.cargarGruposUsuario(currentUser.id);
    
    // Calcular estadísticas
    let totalTeDeben = 0;
    let totalPendiente = 0;
    
    // Total que te deben: suma de todos los balances positivos del usuario en cada grupo
    for (const grupo of grupos) {
      await gruposManager.cargarDetalleGrupo(grupo.id);
      const balances = gruposManager.calcularBalances(grupo.id);
      const balanceUsuario = balances[currentUser.id] || 0;
      
      // Si el balance es positivo, otros me deben dinero
      if (balanceUsuario > 0) {
        totalTeDeben += balanceUsuario;
      }
      
      // Si el balance es negativo, yo debo dinero
      if (balanceUsuario < 0) {
        totalPendiente += Math.abs(balanceUsuario);
      }
    }

    // Actualizar resumen
    document.getElementById("statTotalTransacciones").textContent = transacciones.length;
    document.getElementById("statTotalTeDeben").textContent = totalTeDeben.toFixed(2) + "€";
    document.getElementById("statTotalPendiente").textContent = totalPendiente.toFixed(2) + "€";

    // Mostrar historial
    const historialDiv = document.getElementById("historialTransacciones");

    if (transacciones.length === 0) {
      historialDiv.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-receipt"></i>
          <h3>No hay transacciones</h3>
          <p>Aún no has participado en ninguna transacción</p>
        </div>
      `;
      return;
    }

    // Ordenar por fecha (más reciente primero)
    transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    historialDiv.innerHTML = transacciones.map(t => {
      const esPagador = t.pagadorId === String(currentUser.id);
      const tipoClass = esPagador ? 'success' : 'danger';
      const tipoIcon = esPagador ? 'fa-arrow-up' : 'fa-arrow-down';
      const tipoTexto = esPagador ? 'Pagaste' : 'Debes';

      return `
        <div class="transaction-item">
          <div class="transaction-icon ${tipoClass}">
            <i class="fas ${tipoIcon}"></i>
          </div>
          <div class="transaction-info">
            <div class="transaction-header">
              <h4>${escapeHtml(t.concepto)}</h4>
            </div>
            <div class="transaction-details">
              <span class="transaction-group"><i class="fas fa-users"></i> ${escapeHtml(t.grupoNombre)}</span>
              <span class="transaction-type">${tipoTexto}</span>
              <span class="transaction-date"><i class="fas fa-clock"></i> ${formatearFecha(t.fecha)}</span>
            </div>
            ${!esPagador ? `<div class="transaction-payer">Pagador: ${escapeHtml(t.pagadorNombre)}</div>` : ''}
          </div>
          <span class="transaction-amount ${tipoClass}">${esPagador ? '+' : '-'}${Number(t.monto).toFixed(2)}€</span>
          <div class="transaction-status">
            <span class="badge ${t.estado === 'completada' ? 'success' : 'warning'}">
              ${t.estado === 'completada' ? 'Completada' : 'Pendiente'}
            </span>
          </div>
        </div>
      `;
    }).join('');
    
    // Calcular quién debe a quién
    const deudores = {}; // Personas que me deben
    const acreedores = {}; // Personas a las que debo
    
    for (const grupo of grupos) {
      const grupoDetalle = gruposManager.obtenerGrupo(grupo.id);
      if (!grupoDetalle) continue;
      
      const balances = gruposManager.calcularBalances(grupo.id);
      const miBalance = balances[currentUser.id] || 0;
      let restantePorCobrar = miBalance > 0 ? miBalance : 0;
      let restantePorPagar = miBalance < 0 ? Math.abs(miBalance) : 0;
      
      // Si tengo balance positivo, otros me deben
      // Si tengo balance negativo, yo debo a otros
      
      grupoDetalle.miembros.forEach(miembro => {
        if (miembro.id === currentUser.id) return;
        
        const balanceMiembro = balances[miembro.id] || 0;
        
        // Si yo tengo balance positivo y el otro negativo, me debe
        if (restantePorCobrar > 0 && balanceMiembro < 0) {
          const deuda = Math.min(restantePorCobrar, Math.abs(balanceMiembro));
          if (deuda > 0.01) {
            if (!deudores[miembro.id]) {
              deudores[miembro.id] = { nombre: miembro.nombre, monto: 0 };
            }
            deudores[miembro.id].monto += deuda;
            restantePorCobrar -= deuda;
          }
        }
        
        // Si yo tengo balance negativo y el otro positivo, le debo
        if (restantePorPagar > 0 && balanceMiembro > 0) {
          const deuda = Math.min(restantePorPagar, balanceMiembro);
          if (deuda > 0.01) {
            if (!acreedores[miembro.id]) {
              acreedores[miembro.id] = { nombre: miembro.nombre, monto: 0 };
            }
            acreedores[miembro.id].monto += deuda;
            restantePorPagar -= deuda;
          }
        }
      });
    }
    
    // Mostrar deudores (te deben)
    const deudoresDiv = document.getElementById("usuariosDeudores");
    const listaDeudores = Object.values(deudores);
    
    if (listaDeudores.length === 0) {
      deudoresDiv.innerHTML = `
        <div class="empty-state-small">
          <i class="fas fa-check-circle"></i>
          <p>Nadie te debe dinero</p>
        </div>
      `;
    } else {
      deudoresDiv.innerHTML = listaDeudores.map(d => `
        <div class="debt-item success">
          <div class="debt-user">
            <i class="fas fa-user-circle"></i>
            <span>${escapeHtml(d.nombre)}</span>
          </div>
          <div class="debt-amount">+${d.monto.toFixed(2)}€</div>
        </div>
      `).join('');
    }
    
    // Mostrar acreedores (les debes)
    const acreedoresDiv = document.getElementById("usuariosAcreedores");
    const listaAcreedores = Object.values(acreedores);
    
    if (listaAcreedores.length === 0) {
      acreedoresDiv.innerHTML = `
        <div class="empty-state-small">
          <i class="fas fa-check-circle"></i>
          <p>No debes dinero a nadie</p>
        </div>
      `;
    } else {
      acreedoresDiv.innerHTML = listaAcreedores.map(a => `
        <div class="debt-item danger">
          <div class="debt-user">
            <i class="fas fa-user-circle"></i>
            <span>${escapeHtml(a.nombre)}</span>
          </div>
          <div class="debt-amount">-${a.monto.toFixed(2)}€</div>
        </div>
      `).join('');
    }

  } catch (error) {
    console.error("Error al cargar estadísticas:", error);
    document.getElementById("historialTransacciones").innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error al cargar estadísticas</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}
