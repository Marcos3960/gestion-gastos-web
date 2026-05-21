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


  // Avatar → Ajustes
  document.getElementById("headerAvatar")?.addEventListener("click", () => {
    switchView("ajustes");
    document.querySelectorAll(".nav-item").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-view") === "ajustes");
    });
    cargarAjustes();
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
    const divisaSelect = document.getElementById("divisaGrupo");
    if (divisaSelect) divisaSelect.value = localStorage.getItem("monedaDefault") || "EUR";
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
  applyLanguage(localStorage.getItem('lang') || 'es');
  await authManager.refrescarUsuario();
  await loadGrupos();
  await updateNotificationBadge();
  cargarAjustes();
}


function cargarAjustes() {
  const usuario = authManager.getCurrentUser();
  const initials = usuario?.nombre
    ? usuario.nombre.split(" ").slice(0, 2).map(p => p[0].toUpperCase()).join("")
    : "?";

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("settingsUserName", usuario?.nombre || "—");
  set("settingsUserEmail", usuario?.email || "—");
  set("settingsUserUsername", usuario?.nombreUsuario ? "@" + usuario.nombreUsuario : "—");
  set("profileCardInitials", initials);

  const headerAvatarInitials = document.getElementById("headerAvatarInitials");
  if (headerAvatarInitials) headerAvatarInitials.textContent = initials;

  if (usuario?.id) {
    const fotoUrl = `${API_URL}/usuarios/${encodeURIComponent(usuario.id)}/foto?t=${Date.now()}`;
    const aplicarFoto = (el, inicialesEl) => {
      if (!el) return;
      const img = new Image();
      img.onload = () => {
        el.style.backgroundImage = `url('${fotoUrl}')`;
        el.classList.add("has-photo");
        if (inicialesEl) inicialesEl.style.display = "none";
      };
      img.onerror = () => {
        el.classList.remove("has-photo");
        el.style.backgroundImage = "";
        if (inicialesEl) inicialesEl.style.display = "";
      };
      img.src = fotoUrl;
    };
    aplicarFoto(document.getElementById("profileCardAvatar"), document.getElementById("profileCardInitials"));
    aplicarFoto(document.getElementById("headerAvatar"), headerAvatarInitials);
  }

  // Tema visual — sincronizar botones con estado actual
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  _syncThemeButtons(currentTheme);

  // Perfil inline edit
  const btnEditar  = document.getElementById("btnEditarPerfilSettings");
  const btnGuardar = document.getElementById("btnGuardarPerfilSettings");
  const btnCancelar= document.getElementById("btnCancelarPerfilSettings");
  const uploadLabel= document.getElementById("ajAvatarUploadLabel");

  const setEditMode = on => {
    ["settingsUserName","settingsUserEmail","settingsUserUsername"].forEach(id => {
      document.getElementById(id).style.display = on ? "none" : "";
    });
    ["ajEditNombre","ajEditEmail","ajEditUsername"].forEach(id => {
      document.getElementById(id).style.display = on ? "" : "none";
    });
    if (uploadLabel) uploadLabel.style.display = on ? "flex" : "none";
    btnEditar.style.display  = on ? "none" : "";
    btnGuardar.style.display = on ? "" : "none";
    btnCancelar.style.display= on ? "" : "none";
  };

  // Preview de foto al seleccionar archivo
  const fotoInput = document.getElementById("ajFotoPerfil");
  if (fotoInput) fotoInput.onchange = () => {
    const file = fotoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const avatar = document.getElementById("profileCardAvatar");
      avatar.style.backgroundImage = `url('${e.target.result}')`;
      avatar.classList.add("has-photo");
      document.getElementById("profileCardInitials").style.display = "none";
    };
    reader.readAsDataURL(file);
  };

  if (btnEditar) btnEditar.onclick = () => {
    const u = authManager.getCurrentUser();
    document.getElementById("ajEditNombre").value   = u.nombre || "";
    document.getElementById("ajEditEmail").value    = u.email || "";
    document.getElementById("ajEditUsername").value = u.nombreUsuario || "";
    setEditMode(true);
  };

  if (btnCancelar) btnCancelar.onclick = () => setEditMode(false);

  if (btnGuardar) btnGuardar.onclick = async () => {
    const nombre       = document.getElementById("ajEditNombre").value.trim();
    const email        = document.getElementById("ajEditEmail").value.trim();
    const nombreUsuario= document.getElementById("ajEditUsername").value.trim();
    const password     = null;
    const fotoInput    = document.getElementById("ajFotoPerfil");

    if (!nombre || !email || !nombreUsuario) {
      showPopup("Nombre, email y usuario son obligatorios", "warning"); return;
    }
    try {
      btnGuardar.textContent = "Guardando...";
      btnGuardar.disabled = true;
      await authManager.actualizarPerfil(nombre, nombreUsuario, email, password || null);
      if (fotoInput?.files?.length) {
        const fd = new FormData();
        fd.append("imagen", fotoInput.files[0]);
        const u = authManager.getCurrentUser();
        const r = await fetch(`${API_URL}/usuarios/${encodeURIComponent(u.id)}/foto`, { method: "POST", body: fd });
        if (!r.ok) throw new Error("No se pudo subir la foto");
      }
      showPopup("Perfil actualizado correctamente", "success");
      setEditMode(false);
      cargarAjustes();
    } catch(err) {
      showPopup("Error: " + err.message, "error");
    } finally {
      btnGuardar.innerHTML = '<i class="fas fa-check"></i> Guardar';
      btnGuardar.disabled = false;
    }
  };

  // Botones tema — usar onclick para evitar duplicar listeners
  const darkBtn = document.getElementById("ajThemeDark");
  const lightBtn = document.getElementById("ajThemeLight");
  if (darkBtn) darkBtn.onclick = () => { document.documentElement.setAttribute("data-theme","dark"); localStorage.setItem("theme","dark"); _syncThemeButtons("dark"); };
  if (lightBtn) lightBtn.onclick = () => { document.documentElement.setAttribute("data-theme","light"); localStorage.setItem("theme","light"); _syncThemeButtons("light"); };

  // Moneda predeterminada
  const monedaSelect = document.getElementById("ajMoneda");
  if (monedaSelect) {
    monedaSelect.value = localStorage.getItem("monedaDefault") || "EUR";
    monedaSelect.onchange = () => localStorage.setItem("monedaDefault", monedaSelect.value);
  }

  // Idioma
  const idiomaSelect = document.getElementById("ajIdioma");
  if (idiomaSelect) {
    idiomaSelect.value = localStorage.getItem('lang') || 'es';
    idiomaSelect.onchange = () => applyLanguage(idiomaSelect.value);
  }

  // Preferencias de notificaciones
  const notifGastos    = document.getElementById("notifGastos");
  const notifDeudas    = document.getElementById("notifDeudas");
  const notifActividad = document.getElementById("notifActividad");
  if (notifGastos)    { notifGastos.checked    = localStorage.getItem("notif_gasto")    !== "false"; notifGastos.onchange    = () => { localStorage.setItem("notif_gasto",    notifGastos.checked);    updateNotificationBadge(); }; }
  if (notifDeudas)    { notifDeudas.checked    = localStorage.getItem("notif_deuda")    !== "false"; notifDeudas.onchange    = () => { localStorage.setItem("notif_deuda",    notifDeudas.checked);    updateNotificationBadge(); }; }
  if (notifActividad) { notifActividad.checked = localStorage.getItem("notif_actividad") !== "false"; notifActividad.onchange = () => { localStorage.setItem("notif_actividad", notifActividad.checked); updateNotificationBadge(); }; }

  // Sidebar nav — scroll suave a la sección
  document.querySelectorAll(".aj-nav-item").forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      document.querySelectorAll(".aj-nav-item").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      const target = document.querySelector(link.getAttribute("href"));
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  });

  // Cambiar contraseña inline
  const ajPassToggle  = document.getElementById("ajPassToggle");
  const ajPassForm    = document.getElementById("ajPassForm");
  const ajPassCancelar= document.getElementById("ajPassCancelar");
  const ajPassGuardar = document.getElementById("ajPassGuardar");

  if (ajPassToggle) ajPassToggle.onclick = () => {
    ajPassForm.style.display = "";
    ajPassToggle.style.display = "none";
    document.getElementById("ajPassActual").value = "";
    document.getElementById("ajPassNueva").value = "";
    document.getElementById("ajPassConfirm").value = "";
  };

  if (ajPassCancelar) ajPassCancelar.onclick = () => {
    ajPassForm.style.display = "none";
    ajPassToggle.style.display = "";
  };

  if (ajPassGuardar) ajPassGuardar.onclick = async () => {
    const actual  = document.getElementById("ajPassActual").value.trim();
    const nueva   = document.getElementById("ajPassNueva").value.trim();
    const confirm = document.getElementById("ajPassConfirm").value.trim();
    if (!actual || !nueva || !confirm) { showPopup("Rellena todos los campos", "warning"); return; }
    if (nueva !== confirm) { showPopup("Las contraseñas no coinciden", "warning"); return; }
    if (nueva.length < 6)  { showPopup("La contraseña debe tener al menos 6 caracteres", "warning"); return; }
    try {
      ajPassGuardar.textContent = "Guardando...";
      ajPassGuardar.disabled = true;
      const u = authManager.getCurrentUser();
      // Verificar contraseña actual
      await authManager.login(u.email, actual);
      // Actualizar con la nueva
      const resp = await fetch(`${API_URL}/usuarios/${encodeURIComponent(u.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contrasena: nueva })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo actualizar la contraseña");
      }
      showPopup("Contraseña actualizada correctamente", "success");
      ajPassForm.style.display = "none";
      ajPassToggle.style.display = "";
    } catch(err) {
      const msg = err.message.includes("Credenciales") ? "La contraseña actual no es correcta" : err.message;
      showPopup("Error: " + msg, "error");
    } finally {
      ajPassGuardar.innerHTML = '<i class="fas fa-check"></i> Guardar contraseña';
      ajPassGuardar.disabled = false;
    }
  };
}

function _syncThemeButtons(theme) {
  const darkBtn = document.getElementById("ajThemeDark");
  const lightBtn = document.getElementById("ajThemeLight");
  if (!darkBtn || !lightBtn) return;
  darkBtn.classList.toggle("active", theme === "dark");
  lightBtn.classList.toggle("active", theme === "light");
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
        <h3>${t('js_no_groups')}</h3>
        <p>${t('js_create_first_group')}</p>
      </div>
    `;
    return;
  }


  container.innerHTML = grupos.map(grupo => {
    const inicial = (grupo.nombre || "G")[0].toUpperCase();
    const numMiembros = (grupo.miembros || []).length;
    return `
    <div class="grupo-card" data-grupo-id="${grupo.id}">
      <div class="grupo-card-header">
        <div class="grupo-card-icon">${inicial}</div>
        <span class="grupo-card-badge">${escapeHtml(grupo.divisa)}</span>
      </div>
      <h3 class="grupo-card-title">${escapeHtml(grupo.nombre)}</h3>
      <p class="grupo-card-desc">${escapeHtml(grupo.descripcion || "Sin descripción")}</p>
      <div class="grupo-card-footer">
        <div class="grupo-card-meta">
          <span class="grupo-card-meta-label">Creado</span>
          <span class="grupo-card-meta-value">${formatearFecha(grupo.fechaCreacion)}</span>
        </div>
        <div class="grupo-card-meta">
          <span class="grupo-card-meta-label">Miembros</span>
          <span class="grupo-card-meta-value">${numMiembros}</span>
        </div>
      </div>
      <div class="grupo-card-link">
        <span>Ver detalles</span>
        <i class="fas fa-arrow-right"></i>
      </div>
    </div>
  `;
  }).join("");


  // Buscador de grupos
  const inputBuscar = document.getElementById("buscarGrupos");
  if (inputBuscar) {
    inputBuscar.value = "";
    inputBuscar.oninput = () => {
      const q = inputBuscar.value.trim().toLowerCase();
      document.querySelectorAll(".grupo-card").forEach(card => {
        const nombre = card.querySelector(".grupo-card-title")?.textContent.toLowerCase() || "";
        const desc = card.querySelector(".grupo-card-desc")?.textContent.toLowerCase() || "";
        card.style.display = (!q || nombre.includes(q) || desc.includes(q)) ? "" : "none";
      });
    };
  }

  // Click en grupo
  document.querySelectorAll(".grupo-card").forEach(card => {
    card.addEventListener("click", () => {
      const grupoId = card.dataset.grupoId;
      verDetalleGrupo(grupoId);
    });
  });
}


let _tabActivo = "overview";

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
    <div class="grupo-actions-left">
      <button class="btn-primary" onclick="abrirModalTransaccionGrupo('${grupoId}')">
        <i class="fas fa-plus"></i> Añadir gasto
      </button>
      ${esAdmin ? `
        <button class="btn-secondary" onclick="abrirMiembrosGrupo('${grupoId}')">
          <i class="fas fa-user-plus"></i> Añadir miembros
        </button>
        <button class="btn-secondary" onclick="abrirModalEditarGrupo('${grupoId}')">
          <i class="fas fa-edit"></i> Editar grupo
        </button>
      ` : ''}
    </div>
    <div class="grupo-actions-right">
      ${esAdmin ? `
        <button class="btn-danger" onclick="eliminarGrupo('${grupoId}')">
          <i class="fas fa-trash"></i> Eliminar grupo
        </button>
      ` : `
        <button class="btn-danger" onclick="salirDelGrupo('${grupoId}')">
          <i class="fas fa-sign-out-alt"></i> Salir del grupo
        </button>
      `}
    </div>
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

  // Mapa de nombres: incluye miembros actuales + participantes históricos de transacciones
  const nombresPorId = {};
  (grupo.miembros || []).forEach(m => { nombresPorId[String(m.id)] = m.nombre; });
  (grupo.transacciones || []).forEach(t => {
    if (t.id_pagador && t.nombre_pagador) nombresPorId[String(t.id_pagador)] = t.nombre_pagador;
    (t.participantes || []).forEach(p => {
      if (p.id_usuario && p.usuario_nombre) nombresPorId[String(p.id_usuario)] = p.usuario_nombre;
    });
  });

  const transaccionesGasto = (grupo.transacciones || []).filter(t => t.tipo === "gasto");
  const gastoTotalGrupo = transaccionesGasto.reduce((acc, t) => acc + Number(t.monto || 0), 0);
  const totalEl = document.getElementById("detalleGrupoTotalGasto");
  if (totalEl) totalEl.textContent = `${gastoTotalGrupo.toFixed(2)} ${grupo.divisa}`;
  const gastoUsuario = transaccionesGasto.reduce((acc, t) => {
    const parteUsuario = (t.participantes || []).find(
      p => String(p.id_usuario) === String(currentUser.id)
    );
    return acc + Number(parteUsuario?.monto_debe || 0);
  }, 0);

  const balancesContainer = document.getElementById("detalleGrupoBalances");
  balancesContainer.innerHTML = `
    <div class="balance-total-header">
      <span class="balance-total-label">TOTAL GASTADO</span>
      <span class="balance-total-value">${gastoTotalGrupo.toFixed(2)} ${grupo.divisa}</span>
    </div>
    <div class="balance-rows">
      ${Object.entries(balances).map(([userId, balance]) => {
        const nombre = nombresPorId[String(userId)] || "Usuario eliminado";
        const colorClass = balance > 0 ? "balance-positivo" : balance < 0 ? "balance-negativo" : "balance-neutro";
        const statusText = balance > 0 ? "A favor" : balance < 0 ? "Debe" : "Al día";
        return `
          <div class="balance-row">
            <div class="balance-row-left">
              <div class="miembro-avatar" aria-hidden="true">
                <span class="miembro-avatar-fallback">${escapeHtml(obtenerInicialesNombre(nombre))}</span>
                <img src="${API_URL}/usuarios/${encodeURIComponent(userId)}/foto"
                  alt="" loading="lazy" onerror="this.remove()">
              </div>
              <div class="balance-row-info">
                <span class="balance-row-name">${escapeHtml(nombre)}</span>
                <span class="balance-row-status ${colorClass}">${statusText}</span>
              </div>
            </div>
            <span class="balance-row-amount ${colorClass}">${balance > 0 ? '+' : ''}${balance.toFixed(2)} ${grupo.divisa}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;


  // Transacciones
  renderTransacciones(grupo, grupoId, esAdmin, currentUser);
  setupTxControls(grupo, grupoId, esAdmin, currentUser);
  renderTxChart(grupo);



  switchView("detalleGrupo");
  cargarLogGrupo(grupoId);

  // Tab switching
  const tabs = document.querySelectorAll(".grupo-tab");
  const panels = { overview: "tabOverview", transacciones: "tabTransacciones", actividad: "tabActividad" };
  tabs.forEach(tab => {
    tab.onclick = () => {
      _tabActivo = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      Object.values(panels).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
      const active = document.getElementById(panels[tab.dataset.tab]);
      if (active) active.style.display = "flex";
    };
  });
  // Restore active tab (or default to overview)
  const tabToRestore = Array.from(tabs).find(t => t.dataset.tab === _tabActivo) || tabs[0];
  tabToRestore?.click();
}

// ── TRANSACCIONES TAB ────────────────────────────────────────────────────────

let txChartInstance = null;

function txIcono(concepto) {
  const c = (concepto || "").toLowerCase();
  if (/comida|restaurante|cena|almuerzo|desayuno|bistro|cafe/.test(c)) return "fa-utensils";
  if (/hotel|alojamiento|airbnb|hostal/.test(c)) return "fa-bed";
  if (/gasolinera|gasolina|combustible|fuel|coche|taxi|uber/.test(c)) return "fa-gas-pump";
  if (/super|mercado|compra|tienda|grocery/.test(c)) return "fa-shopping-cart";
  if (/vuelo|avión|viaje|tren|bus/.test(c)) return "fa-plane";
  return "fa-receipt";
}

function renderTransaccionItem(t, grupoId, esAdmin, currentUser, divisa) {
  const participantesHtml = (t.participantes && t.participantes.length > 0) ? `
    <div class="tx-participantes">
      ${t.participantes.map(p => `
        <span class="tx-participante ${p.pagado ? 'pagado' : 'pendiente'}">
          <span class="tx-p-nombre">${escapeHtml(p.usuario_nombre)}</span>
          <span class="tx-p-monto">${Number(p.monto_debe).toFixed(2)} ${divisa}</span>
          ${p.pagado
            ? `<i class="fas fa-check tx-p-check"></i>`
            : (esAdmin || String(p.id_usuario) === String(currentUser.id)
                ? `<button class="tx-btn-pay" onclick="marcarComoPagado('${grupoId}','${t.id}','${p.id_usuario}')" title="Confirmar pago"><i class="fas fa-check-circle"></i></button>`
                : '')
          }
        </span>
      `).join('')}
    </div>
  ` : '';

  const actionsHtml = (t.tieneImagen || esAdmin) ? `
    <div class="tx-actions">
      ${t.tieneImagen ? `<button class="tx-btn-action" onclick="verImagenTransaccion('${t.id}')"><i class="fas fa-image"></i> Ver imagen</button>` : ''}
      ${esAdmin ? `<button class="tx-btn-action edit" onclick="abrirModalEditarTransaccion('${grupoId}','${t.id}')"><i class="fas fa-edit"></i> Editar</button>` : ''}
    </div>
  ` : '';

  return `
    <div class="tx-item" data-concepto="${escapeHtml((t.concepto || '').toLowerCase())}">
      <div class="tx-item-icon">
        <i class="fas ${txIcono(t.concepto)}"></i>
      </div>
      <div class="tx-item-body">
        <div class="tx-item-top">
          <div class="tx-item-info">
            <span class="tx-item-concepto">${escapeHtml(t.concepto)}</span>
            <span class="tx-item-meta">PAGADO POR ${escapeHtml((t.pagadorNombre || '').toUpperCase())} &bull; ${formatearFechaCorta(t.fecha)}</span>
          </div>
          <div class="tx-item-right">
            <span class="tx-item-monto">&euro;${Number(t.monto).toFixed(2)}</span>
            ${t.participantes && t.participantes.length > 1 ? `<span class="tx-item-split">Split Evenly</span>` : ''}
          </div>
        </div>
        ${participantesHtml}
        ${actionsHtml}
      </div>
    </div>
  `;
}

function renderTransacciones(grupo, grupoId, esAdmin, currentUser, filtro = "", estadoFiltro = "todos", usuarioFiltro = "todos") {
  const container = document.getElementById("detalleGrupoTransacciones");
  const countEl = document.getElementById("txCount");

  let txs = (grupo.transacciones || []);

  if (filtro) txs = txs.filter(t => (t.concepto || "").toLowerCase().includes(filtro));

  if (estadoFiltro === "pagado") {
    txs = txs.filter(t => {
      if (!t.participantes || t.participantes.length === 0) return true;
      return t.participantes.every(p => p.pagado);
    });
  } else if (estadoFiltro === "pendiente") {
    txs = txs.filter(t => {
      if (!t.participantes || t.participantes.length === 0) return false;
      return t.participantes.some(p => !p.pagado);
    });
  }

  if (usuarioFiltro !== "todos") {
    txs = txs.filter(t => String(t.pagadorId || t.id_pagador) === String(usuarioFiltro));
  }

  if (countEl) countEl.textContent = `Mostrando ${txs.length} gasto${txs.length !== 1 ? 's' : ''}`;

  if (txs.length === 0) {
    container.innerHTML = `<div class="tx-empty"><i class="fas fa-receipt"></i><p>Sin resultados</p></div>`;
    return;
  }

  // Agrupar por mes
  const grupos = {};
  txs.forEach(t => {
    const d = t.fecha ? new Date(t.fecha) : new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(t);
  });

  container.innerHTML = Object.keys(grupos).sort().reverse().map(key => {
    const [y, m] = key.split('-');
    const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const total = grupos[key].reduce((s, t) => s + Number(t.monto || 0), 0);
    return `
      <div class="tx-month-header">
        <span class="tx-month-label">${label.toUpperCase()}</span>
        <span class="tx-month-total">&euro;${total.toFixed(2)}</span>
      </div>
      ${grupos[key].map(t => renderTransaccionItem(t, grupoId, esAdmin, currentUser, grupo.divisa)).join('')}
    `;
  }).join('');
}

function setupTxControls(grupo, grupoId, esAdmin, currentUser) {
  const input = document.getElementById("txSearchInput");
  if (input) input.value = "";

  // Poblar filtro por usuario (pagadores únicos)
  const usuarioContainer = document.getElementById("txUsuarioFilters");
  if (usuarioContainer) {
    const pagadores = {};
    (grupo.transacciones || []).forEach(t => {
      const id = String(t.pagadorId || t.id_pagador || '');
      if (id && !pagadores[id]) pagadores[id] = t.pagadorNombre || 'Desconocido';
    });
    const btnsTodos = `<button class="tx-filter-btn active" data-usuario="todos">Todos</button>`;
    const btnsUsuarios = Object.entries(pagadores).map(([id, nombre]) =>
      `<button class="tx-filter-btn" data-usuario="${id}">${escapeHtml(nombre.split(' ')[0])}</button>`
    ).join('');
    usuarioContainer.innerHTML = btnsTodos + btnsUsuarios;
  }

  const getFiltros = () => ({
    texto: input ? input.value.trim().toLowerCase() : "",
    estado: document.querySelector('#txEstadoFilters .tx-filter-btn.active')?.dataset.estado || "todos",
    usuario: document.querySelector('#txUsuarioFilters .tx-filter-btn.active')?.dataset.usuario || "todos",
  });

  const aplicar = () => {
    const { texto, estado, usuario } = getFiltros();
    renderTransacciones(grupo, grupoId, esAdmin, currentUser, texto, estado, usuario);
  };

  if (input) input.oninput = aplicar;

  ['txEstadoFilters', 'txUsuarioFilters'].forEach(containerId => {
    const cont = document.getElementById(containerId);
    if (!cont) return;
    cont.onclick = e => {
      const btn = e.target.closest('.tx-filter-btn');
      if (!btn) return;
      cont.querySelectorAll('.tx-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aplicar();
    };
  });
}

function formatearFechaCorta(fechaStr) {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function renderTxChart(grupo) {
  const canvas = document.getElementById("txMonthlyChart");
  if (!canvas) return;
  if (txChartInstance) { txChartInstance.destroy(); txChartInstance = null; }

  const txs = (grupo.transacciones || []).filter(t => t.tipo === 'gasto');
  const mapaMonths = {};
  txs.forEach(t => {
    if (!t.fecha) return;
    const d = new Date(t.fecha);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    mapaMonths[key] = (mapaMonths[key] || 0) + Number(t.monto || 0);
  });

  const sorted = Object.keys(mapaMonths).sort().slice(-6);
  const labels = sorted.map(k => {
    const [y, m] = k.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).toUpperCase();
  });
  const data = sorted.map(k => mapaMonths[k]);

  txChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: 'rgba(183,196,255,0.25)',
        borderColor: 'rgba(183,196,255,0.8)',
        borderWidth: 2,
        borderRadius: 6,
        barPercentage: 0.9,
        categoryPercentage: 0.85,
        hoverBackgroundColor: 'rgba(183,196,255,0.45)',
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => `€${ctx.parsed.y.toFixed(2)}` }
      }},
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } }
      }
    }
  });
}

// ── LOG DE ACTIVIDAD ──────────────────────────────────────────────────────────
const LOG_ICONOS = {
  grupo_creado:    "fa-flag",
  miembro_añadido: "fa-user-plus",
  miembro_salió:   "fa-sign-out-alt",
  miembro_eliminado: "fa-user-minus",
  gasto_creado:    "fa-plus-circle",
  gasto_editado:   "fa-edit",
  pago_marcado:    "fa-check-circle",
};

async function cargarLogGrupo(grupoId) {
  const logList = document.getElementById("logList");
  const btnToggle = document.getElementById("btnToggleLog");
  const logContainer = document.getElementById("logContainer");
  const btnMas = document.getElementById("btnMostrarMasLog");
  const logSearchInput = document.getElementById("logSearchInput");
  const logUsuarioFilters = document.getElementById("logUsuarioFilters");
  if (btnMas) btnMas.style.display = "none";
  if (logContainer) logContainer.style.display = "block";

  let logs = [];
  try {
    const res = await fetch(`${API_URL}/grupos/${grupoId}/log`);
    logs = await res.json();
    if (!Array.isArray(logs)) { console.error('Log no es array:', logs); logs = []; }
  } catch (e) { console.error('Error cargando log:', e); return; }

  // Poblar filtros de usuario
  if (logUsuarioFilters) {
    const nombres = [...new Set(logs.map(l => l.nombre_usuario).filter(Boolean))];
    logUsuarioFilters.innerHTML = `<button class="tx-filter-btn active" data-usuario="todos">Todos</button>` +
      nombres.map(nombre =>
        `<button class="tx-filter-btn" data-usuario="${escapeHtml(nombre)}">${escapeHtml(nombre)}</button>`
      ).join('');
    logUsuarioFilters.onclick = e => {
      const btn = e.target.closest('.tx-filter-btn');
      if (!btn) return;
      logUsuarioFilters.querySelectorAll('.tx-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLog();
    };
  }

  if (logSearchInput) {
    logSearchInput.value = '';
    logSearchInput.oninput = () => renderLog();
  }

  let mostrandoTodo = false;
  const LIMITE = 5;

  function tiempoRelativo(fechaStr) {
    const diff = Date.now() - new Date(fechaStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Ahora mismo';
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Hace ${h}h`;
    if (h < 48) return 'Ayer';
    return new Date(fechaStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  function parseGastoPreview(descripcion) {
    const m = descripcion.match(/"(.+?)"\s+por\s+([\d.,]+)/);
    if (!m) return null;
    return { concepto: m[1], monto: m[2] };
  }

  function accionTexto(l) {
    const nombre = `<strong>${escapeHtml(l.nombre_usuario || 'Sistema')}</strong>`;
    switch (l.tipo_accion) {
      case 'gasto_creado':    return `${nombre} añadió un gasto`;
      case 'gasto_editado': {
        const resto = l.descripcion ? l.descripcion.replace(/^[^"]*editó\s+/, 'editó ') : 'editó un gasto';
        return `${nombre} ${escapeHtml(resto)}`;
      }
      case 'pago_marcado': {
        const resto = l.descripcion ? l.descripcion.replace(/^[^ ]+ marcó su parte de /, 'pagó su parte de ') : 'pagó su parte';
        return `${nombre} ${escapeHtml(resto)}`;
      }
      case 'miembro_añadido': return `${nombre} se unió al grupo`;
      case 'miembro_salió':   return `${nombre} abandonó el grupo`;
      case 'miembro_eliminado': return `${nombre} fue eliminado del grupo`;
      case 'grupo_creado':    return `${nombre} creó el grupo`;
      default: return `<strong>${escapeHtml(l.nombre_usuario || '')}</strong> ${escapeHtml(l.descripcion)}`;
    }
  }

  function renderLog() {
    const texto = logSearchInput ? logSearchInput.value.trim().toLowerCase() : '';
    const usuarioActivo = logUsuarioFilters
      ? (logUsuarioFilters.querySelector('.tx-filter-btn.active')?.dataset.usuario || 'todos')
      : 'todos';

    let filtrados = logs;
    if (texto) filtrados = filtrados.filter(l => (l.descripcion || '').toLowerCase().includes(texto));
    if (usuarioActivo !== 'todos') filtrados = filtrados.filter(l => l.nombre_usuario === usuarioActivo);

    const visibles = mostrandoTodo ? filtrados : filtrados.slice(0, LIMITE);

    if (!visibles.length) {
      logList.innerHTML = `<p class="log-empty">Sin actividad registrada</p>`;
    } else {
      logList.innerHTML = visibles.map((l, i) => {
        const icono = LOG_ICONOS[l.tipo_accion] || "fa-circle";
        const esUltimo = i === visibles.length - 1;
        const preview = (l.tipo_accion === 'gasto_creado' || l.tipo_accion === 'gasto_editado')
          ? parseGastoPreview(l.descripcion) : null;
        const esNuevo = (Date.now() - new Date(l.fecha).getTime()) < 3600000;

        const previewHtml = preview ? `
          <div class="log-tl-preview">
            <div class="log-tl-preview-info">
              <span class="log-tl-preview-concepto">${escapeHtml(preview.concepto)}</span>
              <span class="log-tl-preview-monto">${preview.monto} EUR</span>
            </div>
            ${esNuevo ? `<span class="log-tl-badge">NEW</span>` : ''}
          </div>` : '';

        const avatarHtml = l.id_usuario ? `
          <div class="log-tl-avatar">
            <span class="log-tl-avatar-fb">${escapeHtml(obtenerInicialesNombre(l.nombre_usuario || '?'))}</span>
            <img src="${API_URL}/usuarios/${encodeURIComponent(l.id_usuario)}/foto" alt="" onerror="this.remove()">
          </div>` : '';

        return `
          <div class="log-tl-item">
            <div class="log-tl-icon-wrap">
              <i class="fas ${icono}"></i>
            </div>
            <div class="log-tl-right">
              <div class="log-tl-header">
                <div class="log-tl-who">
                  ${avatarHtml}
                  <span class="log-tl-desc">${accionTexto(l)}</span>
                </div>
                <span class="log-tl-time">${tiempoRelativo(l.fecha)}</span>
              </div>
              ${previewHtml}
            </div>
          </div>`;
      }).join('');
    }

    if (btnToggle) {
      const hayMas = filtrados.length > LIMITE;
      btnToggle.style.display = hayMas ? "flex" : "none";
      btnToggle.innerHTML = mostrandoTodo ? `<i class="fas fa-minus"></i>` : `<i class="fas fa-plus"></i>`;
      btnToggle.title = mostrandoTodo ? "Mostrar menos" : `Mostrar todo (${filtrados.length})`;
    }
  }

  renderLog();

  if (btnToggle) {
    btnToggle.onclick = () => { mostrandoTodo = !mostrandoTodo; renderLog(); };
  }
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

  // Reset file input feedback
  const imagenInput = document.getElementById("imagenTransaccion");
  const uploadLabel = imagenInput?.closest(".file-upload-label");
  if (imagenInput) imagenInput.value = "";
  if (uploadLabel) {
    uploadLabel.classList.remove("file-attached");
    uploadLabel.querySelector("span").textContent = "Seleccionar imagen";
    uploadLabel.querySelector("i").className = "fas fa-cloud-upload-alt";
  }
  imagenInput?.addEventListener("change", function handler() {
    if (imagenInput.files && imagenInput.files[0]) {
      const name = imagenInput.files[0].name;
      uploadLabel.classList.add("file-attached");
      uploadLabel.querySelector("span").textContent = name.length > 28 ? name.slice(0, 25) + "…" : name;
      uploadLabel.querySelector("i").className = "fas fa-check-circle";
    } else {
      uploadLabel.classList.remove("file-attached");
      uploadLabel.querySelector("span").textContent = "Seleccionar imagen";
      uploadLabel.querySelector("i").className = "fas fa-cloud-upload-alt";
    }
    imagenInput.removeEventListener("change", handler);
    imagenInput.addEventListener("change", handler);
  }, { once: true });

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
    containerParticipantes.innerHTML = `<div class="participantes-toggle-grid">${
      grupo.miembros.map(m => {
        const iniciales = obtenerInicialesNombre(m.nombre);
        return `
          <button type="button" class="participante-toggle active" data-id="${m.id}">
            <div class="participante-toggle-avatar">${escapeHtml(iniciales)}<img src="${API_URL}/usuarios/${encodeURIComponent(m.id)}/foto" onerror="this.remove()" loading="lazy"></div>
            <span class="participante-toggle-nombre">${escapeHtml(m.nombre.split(' ')[0])}</span>
            <span class="participante-toggle-check"><i class="fas fa-check"></i></span>
          </button>`;
      }).join("")
    }</div>`;

    containerParticipantes.querySelectorAll('.participante-toggle').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('active'));
    });
  }


  // Manejar submit
  const form = document.getElementById("formTransaccionGrupo");
  form.onsubmit = async (e) => {
    e.preventDefault();

    const concepto = document.getElementById("conceptoTransaccionGrupo").value;
    const monto = document.getElementById("montoTransaccionGrupo").value;
    const fecha = document.getElementById("fechaTransaccion").value;
    const pagadorId = selectPagador.value;

    const participantesSeleccionados = Array.from(containerParticipantes.querySelectorAll('.participante-toggle.active')).map(btn => btn.dataset.id);

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
let grupoIdActualAddMiembros = null;

function abrirMiembrosGrupo(grupoId) {
  abrirModalAddMiembros(grupoId);
}

async function abrirModalAddMiembros(grupoId) {
  grupoIdActualAddMiembros = grupoId;
  miembrosSeleccionadosGrupoGlobal = [];
  document.getElementById("buscarUsuarioGrupo").value = "";
  document.getElementById("resultadosBusquedaGrupo").innerHTML = "";
  document.getElementById("miembrosSeleccionadosGrupo").innerHTML = "";
  openModal("modalAddMiembros");
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
      const grupo = gruposManager.obtenerGrupo(grupoIdActualAddMiembros);
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
              <i class="fas fa-check"></i>
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

document.getElementById("formAddMiembros").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (miembrosSeleccionadosGrupoGlobal.length === 0) {
    showPopup("Debes seleccionar al menos un miembro", "warning");
    return;
  }

  try {
    const miembrosIds = miembrosSeleccionadosGrupoGlobal.map(m => Number(m.id));
    await fetch(`${API_URL}/grupos/${grupoIdActualAddMiembros}/miembros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarios_ids: miembrosIds })
    });
    
    closeModal("modalAddMiembros");
    await verDetalleGrupo(grupoIdActualAddMiembros);
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

function abrirModalEditarGrupo(grupoId) {
  const cached = gruposManager.detalles.get(String(grupoId));
  const nombre = cached?.grupo?.nombre || document.getElementById("detalleGrupoNombre")?.textContent || "";
  const desc = cached?.grupo?.descripcion || document.getElementById("detalleGrupoDescripcion")?.textContent || "";
  const divisa = cached?.grupo?.divisa || document.getElementById("detalleGrupoDivisa")?.textContent || "EUR";

  document.getElementById("editNombreGrupo").value = nombre;
  document.getElementById("editDescripcionGrupo").value = desc === "Sin descripción" ? "" : desc;
  document.getElementById("editDivisaGrupo").value = divisa;

  const form = document.getElementById("formEditarGrupo");
  form.onsubmit = async e => {
    e.preventDefault();
    const currentUser = authManager.getCurrentUser();
    try {
      const res = await fetch(`${API_URL}/grupos/${grupoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: document.getElementById("editNombreGrupo").value.trim(),
          descripcion: document.getElementById("editDescripcionGrupo").value.trim(),
          divisa: document.getElementById("editDivisaGrupo").value,
          id_usuario: currentUser.id
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Error"); }
      closeModal("modalEditarGrupo");
      showPopup("Grupo actualizado correctamente", "success");
      await verDetalleGrupo(grupoId);
    } catch (err) {
      showPopup("Error: " + err.message, "error");
    }
  };
  openModal("modalEditarGrupo");
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
function notifTipo(n) {
  if (n.tipo) return n.tipo;
  // fallback por contenido para notifs antiguas sin columna tipo
  const msg = (n.mensaje || "").toLowerCase();
  if (msg.startsWith("[gasto]") || msg.includes("añadió")) return "gasto";
  if (msg.startsWith("[deuda]") || msg.includes("debes")) return "deuda";
  if (msg.startsWith("[actividad]") || msg.includes("añadido al grupo") || msg.includes("unió")) return "actividad";
  return "gasto";
}

function notifFiltrada(n) {
  const tipo = notifTipo(n);
  if (tipo === "gasto"    && localStorage.getItem("notif_gasto")    === "false") return false;
  if (tipo === "deuda"    && localStorage.getItem("notif_deuda")    === "false") return false;
  if (tipo === "actividad" && localStorage.getItem("notif_actividad") === "false") return false;
  return true;
}

function notifMensajeLimpio(n) {
  return (n.mensaje || "").replace(/^\[(gasto|deuda|actividad)\]\s*/i, "");
}

async function loadNotificaciones() {
  const currentUser = authManager.getCurrentUser();
  const notifs = await notificationsManager.obtenerNotificacionesUsuario(currentUser.id);

  const container = document.getElementById("notificationsList");
  const visibles = (notifs || []).filter(notifFiltrada);

  if (visibles.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bell-slash"></i>
        <p>No tienes notificaciones</p>
      </div>
    `;
    return;
  }

  const iconoTipo = tipo => ({ gasto: "fa-receipt", deuda: "fa-euro-sign", actividad: "fa-users" }[tipo] || "fa-bell");

  container.innerHTML = visibles.map(n => `
    <div class="notification-item ${n.leida ? 'leida' : 'no-leida'}" data-notif-id="${n.id}">
      <div class="notif-icon-wrap"><i class="fas ${iconoTipo(notifTipo(n))}"></i></div>
      <div class="notif-body">
        <p>${escapeHtml(notifMensajeLimpio(n))}</p>
        <small>${formatearFecha(n.fecha)}</small>
      </div>
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
  const notifs = await notificationsManager.obtenerNotificacionesUsuario(currentUser.id);
  const count = (notifs || []).filter(n => !n.leida && notifFiltrada(n)).length;

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
  const searchBar = document.querySelector(".header-search");
  if (searchBar) searchBar.style.display = (viewId === "grupos" || viewId === "detalleGrupo") ? "" : "none";
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
    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    const popup = document.createElement("div");
    popup.className = "app-popup confirm";
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add("show"));

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
      popup.classList.remove("show");
      overlay.classList.remove("show");
      setTimeout(() => {
        popup.remove();
        overlay.remove();
      }, 220);
      resolve(result);
    };

    cancelBtn.addEventListener("click", () => close(false));
    confirmBtn.addEventListener("click", () => close(true));
    overlay.addEventListener("click", () => close(false));

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    popup.appendChild(body);
    popup.appendChild(actions);
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
let _statsChart = null;

async function loadEstadisticas() {
  const currentUser = authManager.getCurrentUser();
  if (!currentUser) return;

  try {
    const [transacciones, grupos] = await Promise.all([
      transaccionesManager.obtenerTransaccionesUsuario(currentUser.id),
      gruposManager.cargarGruposUsuario(currentUser.id)
    ]);

    // Cargar detalles de todos los grupos para calcular balances
    await Promise.all(grupos.map(g => gruposManager.cargarDetalleGrupo(g.id)));

    // ---- Balances netos ----
    let totalTeDeben = 0;
    let totalDebo = 0;
    // contactos: { id -> { nombre, id, monto (+me debe / -le debo) } }
    const contactos = {};

    for (const grupo of grupos) {
      const grupoDetalle = gruposManager.obtenerGrupo(grupo.id);
      if (!grupoDetalle) continue;
      const balances = gruposManager.calcularBalances(grupo.id);
      const miBalance = balances[currentUser.id] || 0;
      if (miBalance > 0) totalTeDeben += miBalance;
      if (miBalance < 0) totalDebo += Math.abs(miBalance);

      let restaCobrar = miBalance > 0 ? miBalance : 0;
      let restaPagar  = miBalance < 0 ? Math.abs(miBalance) : 0;

      grupoDetalle.miembros.forEach(m => {
        if (String(m.id) === String(currentUser.id)) return;
        const bm = balances[m.id] || 0;
        if (restaCobrar > 0 && bm < 0) {
          const d = Math.min(restaCobrar, Math.abs(bm));
          if (d > 0.01) {
            if (!contactos[m.id]) contactos[m.id] = { id: m.id, nombre: m.nombre, monto: 0 };
            contactos[m.id].monto += d;
            restaCobrar -= d;
          }
        }
        if (restaPagar > 0 && bm > 0) {
          const d = Math.min(restaPagar, bm);
          if (d > 0.01) {
            if (!contactos[m.id]) contactos[m.id] = { id: m.id, nombre: m.nombre, monto: 0 };
            contactos[m.id].monto -= d;
            restaPagar -= d;
          }
        }
      });
    }

    const neto = totalTeDeben - totalDebo;
    document.getElementById('stNetBalance').textContent = formatEur(neto);
    document.getElementById('stNetBalance').className = 'st-net ' + (neto >= 0 ? 'pos-text' : 'neg-text');
    document.getElementById('stTeDeben').textContent = formatEur(totalTeDeben);
    document.getElementById('stDebo').textContent = formatEur(totalDebo);

    // ---- Liquidación rápida ----
    const deudas = Object.values(contactos).filter(c => c.monto < 0);

    // ---- Saldos por contacto ----
    const contactList = document.getElementById('stSaldosContacto');
    const listaContactos = Object.values(contactos).sort((a, b) => Math.abs(b.monto) - Math.abs(a.monto));
    if (listaContactos.length === 0) {
      contactList.innerHTML = `<div class="st-empty"><i class="fas fa-check-circle"></i><p>${t('js_no_contacts')}</p></div>`;
    } else {
      contactList.innerHTML = listaContactos.map(c => {
        const pos = c.monto > 0;
        const label = pos ? t('stats_contact_owed') : t('stats_contact_owes');
        const initials = obtenerInicialesNombre(c.nombre);
        return `
          <div class="st-contact-row">
            <div class="st-contact-avatar">
              <span>${escapeHtml(initials)}</span>
              <img src="${API_URL}/usuarios/${encodeURIComponent(c.id)}/foto" alt="" onerror="this.remove()">
            </div>
            <div class="st-contact-info">
              <div class="st-contact-name">${escapeHtml(c.nombre)}</div>
              <div class="st-contact-sub">${label}</div>
            </div>
            <span class="st-contact-amount ${pos ? 'pos' : 'neg'}">${pos ? '+' : '-'}${formatEur(Math.abs(c.monto))}</span>
            ${!pos ? `<button class="st-contact-btn saldar">${t('stats_settle_btn')}</button>` : ''}
          </div>`;
      }).join('');
    }

    // ---- Gráfica 6 meses ----
    const ahora = new Date();
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      meses.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase() });
    }

    const gastosPorMes = meses.map(m => {
      return transacciones
        .filter(t => {
          const f = new Date(t.fecha);
          return f.getFullYear() === m.year && f.getMonth() === m.month;
        })
        .reduce((sum, t) => sum + Number(t.monto), 0);
    });

    const partePorMes = meses.map(m => {
      return transacciones
        .filter(t => {
          const f = new Date(t.fecha);
          return f.getFullYear() === m.year && f.getMonth() === m.month && String(t.pagadorId) !== String(currentUser.id);
        })
        .reduce((sum, t) => {
          const participantes = t.participantes || 1;
          return sum + Number(t.monto) / (typeof participantes === 'number' ? participantes : 1);
        }, 0);
    });

    document.getElementById('stChartLegend').innerHTML = `
      <div class="st-legend-item"><div class="st-legend-dot" style="background:#b7c4ff"></div>Gasto total</div>
      <div class="st-legend-item"><div class="st-legend-dot" style="background:#4edea3"></div>Tu parte</div>`;

    const ctx = document.getElementById('statsMonthlyChart').getContext('2d');
    if (_statsChart) { _statsChart.destroy(); _statsChart = null; }
    _statsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: meses.map(m => m.label),
        datasets: [
          {
            label: 'Gasto total',
            data: gastosPorMes,
            backgroundColor: 'rgba(183,196,255,0.25)',
            borderColor: '#b7c4ff',
            borderWidth: 2,
            borderRadius: 6,
            barPercentage: 0.5,
            categoryPercentage: 0.7,
            order: 2
          },
          {
            label: 'Tu parte',
            data: partePorMes,
            type: 'line',
            borderColor: '#4edea3',
            backgroundColor: 'rgba(78,222,163,0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#4edea3',
            pointRadius: 4,
            tension: 0.4,
            fill: true,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${formatEur(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#8d90a2', font: { size: 11 } }
          },
          y: {
            display: false,
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        }
      }
    });

    // ---- Historial ----
    transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    document.getElementById('stTxCount').textContent = `${transacciones.length} ${t('js_tx_count_suffix')}`;

    const tbody = document.getElementById('stHistorialBody');
    const emptyEl = document.getElementById('stHistorialEmpty');

    if (transacciones.length === 0) {
      tbody.innerHTML = '';
      emptyEl.style.display = 'flex';
    } else {
      emptyEl.style.display = 'none';
      tbody.innerHTML = transacciones.map(t => {
        const esPagador = String(t.pagadorId) === String(currentUser.id);
        const parte = esPagador ? Number(t.monto) : -(Number(t.monto));
        const parteClass = esPagador ? 'pos' : 'neg';
        const parteLabel = esPagador ? `+${formatEur(Number(t.monto))}` : `-${formatEur(Number(t.monto))}`;
        const fecha = t.fecha ? new Date(t.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        return `
          <tr>
            <td>
              <div class="st-tx-group">
                <div class="st-tx-group-icon"><i class="fas fa-users"></i></div>
                <span class="st-tx-group-name">${escapeHtml(t.grupoNombre || '—')}</span>
              </div>
            </td>
            <td class="st-tx-date">${fecha}</td>
            <td class="st-tx-concepto">${escapeHtml(t.concepto)}</td>
            <td class="st-tx-monto">${formatEur(Number(t.monto))}</td>
            <td class="st-tx-parte ${parteClass}">${parteLabel}</td>
            <td><span class="st-tx-badge ${t.estado === 'completada' ? 'pagada' : 'pendiente'}">${t.estado === 'completada' ? window.t('stats_badge_paid') : window.t('stats_badge_pending')}</span></td>
          </tr>`;
      }).join('');
    }

  } catch (err) {
    console.error('Error al cargar estadísticas:', err);
  }
}

function formatEur(n) {
  return '€' + Math.abs(n).toFixed(2);
}
