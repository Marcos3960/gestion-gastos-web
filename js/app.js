// app.js - Aplicación principal (API Node/Express + MySQL)



// HTML estático original de #detalleGrupo (para restaurar al cambiar a grupo clásico)
let _detalleGrupoOriginalHTML = null;

document.addEventListener("DOMContentLoaded", () => {
  _detalleGrupoOriginalHTML = document.getElementById('detalleGrupo').innerHTML;
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
  const theme = localStorage.getItem("theme") || "dark";
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


  // Logout (handler de loginScreen, no necesario en app screen)
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    document.getElementById("modalConfirmLogout")?.classList.add("active");
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


  function mostrarConfirmLogout() {
    document.getElementById("modalConfirmLogout").classList.add("active");
  }

  document.getElementById("confirmLogoutCancel")?.addEventListener("click", () => {
    document.getElementById("modalConfirmLogout").classList.remove("active");
  });

  document.getElementById("confirmLogoutAccept")?.addEventListener("click", () => {
    document.getElementById("modalConfirmLogout").classList.remove("active");
    authManager.logout();
    showScreen("loginScreen");
    document.getElementById("loginIdentifier").value = "";
    document.getElementById("loginPassword").value = "";
  });

  // Logout desde ajustes
  document.getElementById("logoutBtn")?.addEventListener("click", mostrarConfirmLogout);

  // Logout desde sidebar
  document.getElementById("sidebarLogoutBtn")?.addEventListener("click", mostrarConfirmLogout);




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
  let miembrosOfflineGlobal = []; // { nombre: string }[]

  function resetModalCrearGrupo() {
    miembrosSeleccionadosGlobal = [];
    miembrosOfflineGlobal = [];
    document.getElementById("formCrearGrupo").reset();
    document.getElementById("formCrearGrupo").style.display = "none";
    document.getElementById("stepTipoGrupo").style.display = "";
    document.getElementById("modalCrearGrupoTitle").textContent = "Crear Nuevo Grupo";
    document.getElementById("resultadosBusqueda").innerHTML = "";
    document.getElementById("miembrosSeleccionados").innerHTML = "";
    document.getElementById("miembrosOfflineList").innerHTML = "";
    document.getElementById("nombreMiembroOffline").value = "";
    const divisaSelect = document.getElementById("divisaGrupo");
    if (divisaSelect) divisaSelect.value = localStorage.getItem("monedaDefault") || "EUR";
  }

  document.getElementById("btnCrearGrupo").addEventListener("click", () => {
    resetModalCrearGrupo();
    openModal("modalCrearGrupo");
  });

  // Paso 1: seleccionar tipo
  document.querySelectorAll(".group-type-card").forEach(card => {
    card.addEventListener("click", () => {
      const tipo = card.dataset.tipo;
      document.getElementById("tipoGrupoInput").value = tipo;
      document.getElementById("stepTipoGrupo").style.display = "none";
      document.getElementById("formCrearGrupo").style.display = "";
      document.getElementById("modalCrearGrupoTitle").textContent =
        tipo === "offline" ? "Nuevo Grupo Offline"
        : tipo === "recurrente" ? "Nuevo Grupo Recurrente"
        : "Nuevo Grupo Clásico";
      document.getElementById("seccionMiembrosClasico").style.display = tipo !== "offline" ? "" : "none";
      document.getElementById("seccionMiembrosOffline").style.display = tipo === "offline" ? "" : "none";
    });
  });

  document.getElementById("btnVolverTipoGrupo").addEventListener("click", () => {
    document.getElementById("formCrearGrupo").style.display = "none";
    document.getElementById("stepTipoGrupo").style.display = "";
    document.getElementById("modalCrearGrupoTitle").textContent = "Crear Nuevo Grupo";
  });

  // Añadir miembro offline
  document.getElementById("btnAddOfflineMember").addEventListener("click", () => {
    const input = document.getElementById("nombreMiembroOffline");
    const nombre = input.value.trim();
    if (!nombre) return;
    if (miembrosOfflineGlobal.find(m => m.nombre.toLowerCase() === nombre.toLowerCase())) {
      showPopup("Ya has añadido ese nombre", "warning"); return;
    }
    miembrosOfflineGlobal.push({ nombre });
    input.value = "";
    actualizarMiembrosOffline();
  });

  document.getElementById("nombreMiembroOffline").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); document.getElementById("btnAddOfflineMember").click(); }
  });

  function actualizarMiembrosOffline() {
    const container = document.getElementById("miembrosOfflineList");
    if (miembrosOfflineGlobal.length === 0) { container.innerHTML = ""; return; }
    container.innerHTML = miembrosOfflineGlobal.map((m, i) => `
      <div class="selected-member">
        <div class="selected-member-info">
          <strong>${escapeHtml(m.nombre)}</strong>
          <small>Offline</small>
        </div>
        <button type="button" class="btn-remove-user" data-idx="${i}"><i class="fas fa-times"></i></button>
      </div>`).join("");
    container.querySelectorAll(".btn-remove-user").forEach(btn => {
      btn.addEventListener("click", () => {
        miembrosOfflineGlobal.splice(Number(btn.dataset.idx), 1);
        actualizarMiembrosOffline();
      });
    });
  }

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
    const tipo = document.getElementById("tipoGrupoInput").value;

    try {
      const data = await gruposManager.crearGrupo(nombre, descripcion, divisa, [], tipo);
      const grupoId = data.id_grupo;

      if (tipo === "clasico" && miembrosSeleccionadosGlobal.length > 0) {
        const currentUser = authManager.getCurrentUser();
        await fetch(`${API_URL}/grupos/${grupoId}/miembros`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuarios_ids: miembrosSeleccionadosGlobal.map(m => Number(m.id)), id_invitador: Number(currentUser.id) })
        });
      }

      if (tipo === "offline") {
        for (const m of miembrosOfflineGlobal) {
          await fetch(`${API_URL}/grupos/${grupoId}/miembros/offline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: m.nombre })
          });
        }
      }

      closeModal("modalCrearGrupo");
      await loadGrupos();
      resetModalCrearGrupo();
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


  // Back to grupos — delegado en document para sobrevivir reemplazos de innerHTML
  document.addEventListener("click", (e) => {
    if (e.target.closest("#btnBackToGrupos")) {
      switchView("grupos");
      document.querySelectorAll(".nav-item").forEach(b =>
        b.classList.toggle("active", b.getAttribute("data-view") === "grupos")
      );
    }
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
    const numMiembros = grupo.numMiembros ?? 0;
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
  // Restaurar HTML estático si fue reemplazado por un grupo recurrente o presupuesto
  const detalleEl = document.getElementById('detalleGrupo');
  if (_detalleGrupoOriginalHTML && !detalleEl.querySelector('#detalleGrupoNombre')) {
    detalleEl.innerHTML = _detalleGrupoOriginalHTML;
  }
  window._recDetRefresh = null;

  await gruposManager.cargarDetalleGrupo(grupoId);
  const grupo = gruposManager.obtenerGrupo(grupoId);
  const currentUser = authManager.getCurrentUser();


  if (!grupo) return;

  // Ruta especial para grupos recurrentes
  if (grupo.tipo === 'recurrente') {
    await renderGrupoRecurrente(grupoId);
    switchView('detalleGrupo');
    return;
  }

  const esAdmin = String(grupo.adminId) === String(currentUser.id);


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
        <div class="miembro-info-wrap">
          <div class="miembro-info">
            <strong>${escapeHtml(m.nombre)}</strong>
            ${m.rol === 'admin' ? '<span class="badge-admin">Admin</span>' : ''}
            ${m.offline ? '<span class="badge-offline">Offline</span>' : ''}
          </div>
          <small>${m.offline ? 'Sin cuenta' : '@' + escapeHtml(m.nombreUsuario || m.email)}</small>
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
      ${Object.entries(balances).sort((a, b) => b[1] - a[1]).map(([userId, balance]) => {
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

  const esPagador = String(t.pagadorId || t.id_pagador) === String(currentUser.id);
  const puedeEliminar = esAdmin || esPagador;
  const puedeEditar = esAdmin || esPagador;

  const actionsHtml = (t.tieneImagen || puedeEditar || puedeEliminar) ? `
    <div class="tx-actions">
      ${t.tieneImagen ? `<button class="tx-btn-action" onclick="verImagenTransaccion('${t.id}')"><i class="fas fa-image"></i> Ver imagen</button>` : ''}
      ${puedeEditar ? `<button class="tx-btn-action edit" onclick="abrirModalEditarTransaccion('${grupoId}','${t.id}')"><i class="fas fa-edit"></i> Editar</button>` : ''}
      ${puedeEliminar ? `<button class="tx-btn-action danger" onclick="eliminarTransaccion('${grupoId}','${t.id}')"><i class="fas fa-trash"></i> Eliminar</button>` : ''}
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
  const esAdmin = String(grupo.adminId) === String(currentUser.id);

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
  const inputMonto = document.getElementById("montoTransaccionGrupo");

  function actualizarMontosPorPersona() {
    const monto = Number(inputMonto.value) || 0;
    const activos = containerParticipantes.querySelectorAll('.participante-row.active');
    const montoPP = activos.length > 0 ? monto / activos.length : 0;
    containerParticipantes.querySelectorAll('.participante-row').forEach(row => {
      const montoEl = row.querySelector('.participante-row-monto');
      if (montoEl) montoEl.textContent = row.classList.contains('active') ? `€${montoPP.toFixed(2)}` : '—';
    });
  }

  if (!grupo.miembros || grupo.miembros.length === 0) {
    containerParticipantes.innerHTML = '<p style="color: var(--on-surface-variant);">No hay miembros en este grupo</p>';
  } else {
    containerParticipantes.innerHTML = `<div class="participantes-list">${
      grupo.miembros.map(m => {
        const iniciales = obtenerInicialesNombre(m.nombre);
        return `
          <button type="button" class="participante-row active" data-id="${m.id}">
            <div class="participante-row-left">
              <div class="participante-row-avatar">
                ${escapeHtml(iniciales)}
                <img src="${API_URL}/usuarios/${encodeURIComponent(m.id)}/foto" onerror="this.remove()" loading="lazy">
              </div>
              <div class="participante-row-info">
                <span class="participante-row-nombre">${escapeHtml(m.nombre)}</span>
                <span class="participante-row-sub">Toca para excluir</span>
              </div>
            </div>
            <div class="participante-row-right">
              <span class="participante-row-monto">—</span>
              <span class="participante-row-check"><i class="fas fa-check"></i></span>
            </div>
          </button>`;
      }).join("")
    }</div>`;

    containerParticipantes.querySelectorAll('.participante-row').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const sub = btn.querySelector('.participante-row-sub');
        if (sub) sub.textContent = btn.classList.contains('active') ? 'Toca para excluir' : 'Excluido';
        actualizarMontosPorPersona();
      });
    });

    inputMonto.oninput = actualizarMontosPorPersona;
    actualizarMontosPorPersona();
  }


  // Manejar submit
  const form = document.getElementById("formTransaccionGrupo");
  form.onsubmit = async (e) => {
    e.preventDefault();

    const concepto = document.getElementById("conceptoTransaccionGrupo").value;
    const monto = document.getElementById("montoTransaccionGrupo").value;
    const fecha = document.getElementById("fechaTransaccion").value;
    const pagadorId = selectPagador.value;

    const participantesSeleccionados = Array.from(containerParticipantes.querySelectorAll('.participante-row.active')).map(btn => btn.dataset.id);

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
  const esAdmin = String(grupo.adminId) === String(currentUser.id);

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

  // Configurar participantes con el mismo formato que nueva transacción
  const containerParticipantes = document.getElementById("editParticipantesTransaccion");
  const inputMontoEdit = document.getElementById("editMontoTransaccion");

  function actualizarMontosEdit() {
    const monto = Number(inputMontoEdit.value) || 0;
    const activos = containerParticipantes.querySelectorAll('.participante-row.active');
    const montoPP = activos.length > 0 ? monto / activos.length : 0;
    containerParticipantes.querySelectorAll('.participante-row').forEach(row => {
      const montoEl = row.querySelector('.participante-row-monto');
      if (montoEl) montoEl.textContent = row.classList.contains('active') ? `€${montoPP.toFixed(2)}` : '—';
    });
  }

  if (!grupo.miembros || grupo.miembros.length === 0) {
    containerParticipantes.innerHTML = '<p style="color: var(--on-surface-variant);">No hay miembros en este grupo</p>';
  } else {
    const participantesIds = (transaccion.participantes || []).map(p => String(p.id_usuario));

    containerParticipantes.innerHTML = `<div class="participantes-list">${
      grupo.miembros.map(m => {
        const iniciales = obtenerInicialesNombre(m.nombre);
        const activo = participantesIds.includes(String(m.id));
        return `
          <button type="button" class="participante-row${activo ? ' active' : ''}" data-id="${m.id}">
            <div class="participante-row-left">
              <div class="participante-row-avatar">
                ${escapeHtml(iniciales)}
                <img src="${API_URL}/usuarios/${encodeURIComponent(m.id)}/foto" onerror="this.remove()" loading="lazy">
              </div>
              <div class="participante-row-info">
                <span class="participante-row-nombre">${escapeHtml(m.nombre)}</span>
                <span class="participante-row-sub">${activo ? 'Toca para excluir' : 'Excluido'}</span>
              </div>
            </div>
            <div class="participante-row-right">
              <span class="participante-row-monto">—</span>
              <span class="participante-row-check"><i class="fas fa-check"></i></span>
            </div>
          </button>`;
      }).join("")
    }</div>`;

    containerParticipantes.querySelectorAll('.participante-row').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const sub = btn.querySelector('.participante-row-sub');
        if (sub) sub.textContent = btn.classList.contains('active') ? 'Toca para excluir' : 'Excluido';
        actualizarMontosEdit();
      });
    });

    inputMontoEdit.oninput = actualizarMontosEdit;
    actualizarMontosEdit();
  }

  // Manejar submit — usar onsubmit para sobrescribir sin clonar el form
  const form = document.getElementById("formEditarTransaccion");

  form.onsubmit = async (e) => {
    e.preventDefault();

    const transaccionIdActual = document.getElementById("editTransaccionId").value;
    const grupoIdActual = document.getElementById("editTransaccionGrupoId").value;

    const concepto = document.getElementById("editConceptoTransaccion").value;
    const monto = document.getElementById("editMontoTransaccion").value;
    const fecha = document.getElementById("editFechaTransaccion").value;
    const pagadorId = document.getElementById("editPagadorTransaccion").value;

    const participantesSeleccionados = Array.from(
      document.getElementById("editParticipantesTransaccion").querySelectorAll('.participante-row.active')
    ).map(btn => btn.dataset.id);

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
      showPopup('Gasto actualizado correctamente', "success");
      if (window._recDetRefresh) { await window._recDetRefresh(); } else { await verDetalleGrupo(grupoIdActual); }
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
  miembrosOfflineGrupoGlobal = [];

  document.getElementById("buscarUsuarioGrupo").value = "";
  document.getElementById("resultadosBusquedaGrupo").innerHTML = "";
  document.getElementById("miembrosSeleccionadosGrupo").innerHTML = "";
  document.getElementById("nombreMiembroOfflineGrupo").value = "";
  document.getElementById("miembrosOfflineGrupoList").innerHTML = "";

  const grupo = gruposManager.obtenerGrupo(grupoId);
  const esOffline = grupo?.tipo === "offline";

  document.getElementById("addMiembrosSeccionClasico").style.display = esOffline ? "none" : "";
  document.getElementById("addMiembrosSeccionOffline").style.display = esOffline ? "" : "none";
  document.getElementById("modalAddMiembrosTitle").textContent = esOffline ? "Añadir Participante Offline" : "Añadir Miembros";
  document.getElementById("modalAddMiembrosSubtitle").textContent = esOffline
    ? "Introduce el nombre del participante"
    : "Busca y selecciona usuarios para añadir";
  document.getElementById("modalAddMiembrosBtn").textContent = esOffline ? "Añadir Participante" : "Añadir Miembros";

  openModal("modalAddMiembros");
}

let miembrosOfflineGrupoGlobal = [];

function actualizarMiembrosOfflineGrupo() {
  const container = document.getElementById("miembrosOfflineGrupoList");
  if (miembrosOfflineGrupoGlobal.length === 0) { container.innerHTML = ""; return; }
  container.innerHTML = miembrosOfflineGrupoGlobal.map((m, i) => `
    <div class="selected-member">
      <div class="selected-member-info">
        <strong>${escapeHtml(m.nombre)}</strong>
        <small>Offline</small>
      </div>
      <button type="button" class="btn-remove-user" data-idx="${i}"><i class="fas fa-times"></i></button>
    </div>`).join("");
  container.querySelectorAll(".btn-remove-user").forEach(btn => {
    btn.addEventListener("click", () => {
      miembrosOfflineGrupoGlobal.splice(Number(btn.dataset.idx), 1);
      actualizarMiembrosOfflineGrupo();
    });
  });
}

document.getElementById("btnAddOfflineMemberGrupo").addEventListener("click", () => {
  const input = document.getElementById("nombreMiembroOfflineGrupo");
  const nombre = input.value.trim();
  if (!nombre) return;
  miembrosOfflineGrupoGlobal.push({ nombre });
  input.value = "";
  actualizarMiembrosOfflineGrupo();
});

document.getElementById("nombreMiembroOfflineGrupo").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("btnAddOfflineMemberGrupo").click(); }
});

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
  const grupo = gruposManager.obtenerGrupo(grupoIdActualAddMiembros);
  const esOffline = grupo?.tipo === "offline";

  try {
    if (esOffline) {
      if (miembrosOfflineGrupoGlobal.length === 0) {
        showPopup("Introduce al menos un nombre", "warning"); return;
      }
      for (const m of miembrosOfflineGrupoGlobal) {
        await fetch(`${API_URL}/grupos/${grupoIdActualAddMiembros}/miembros/offline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: m.nombre })
        });
      }
      closeModal("modalAddMiembros");
      miembrosOfflineGrupoGlobal = [];
      await verDetalleGrupo(grupoIdActualAddMiembros);
      showPopup("Participante añadido correctamente", "success");
    } else {
      if (miembrosSeleccionadosGrupoGlobal.length === 0) {
        showPopup("Debes seleccionar al menos un miembro", "warning"); return;
      }
      const currentUser = authManager.getCurrentUser();
      const miembrosIds = miembrosSeleccionadosGrupoGlobal.map(m => Number(m.id));
      await fetch(`${API_URL}/grupos/${grupoIdActualAddMiembros}/miembros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarios_ids: miembrosIds, id_invitador: currentUser.id })
      });
      closeModal("modalAddMiembros");
      miembrosSeleccionadosGrupoGlobal = [];
      showPopup("Invitaciones enviadas correctamente", "success");
    }
  } catch (error) {
    showPopup("Error al añadir miembros: " + error.message, "error");
  }
});

async function eliminarTransaccion(grupoId, transaccionId) {
  if (!await showConfirmPopup("¿Eliminar este gasto? Esta acción no se puede deshacer.", "Eliminar gasto", "danger")) return;
  const currentUser = authManager.getCurrentUser();
  try {
    const res = await fetch(`${API_URL}/transacciones/${transaccionId}?id_usuario=${currentUser.id}`, {
      method: "DELETE"
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Error"); }
    showPopup("Gasto eliminado correctamente", "success");
    if (window._recDetRefresh) { await window._recDetRefresh(); } else { await verDetalleGrupo(grupoId); }
  } catch (err) {
    showPopup("Error: " + err.message, "error");
  }
}

async function marcarComoPagado(grupoId, transaccionId, usuarioId) {
  if (!await showConfirmPopup("¿Confirmar que este pago ha sido realizado?", "Confirmar pago", "primary")) {
    return;
  }

  try {
    await transaccionesManager.marcarComoPagada(grupoId, transaccionId, usuarioId);
    if (window._recDetRefresh) { await window._recDetRefresh(); } else { await verDetalleGrupo(grupoId); }
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
   GRUPO RECURRENTE
========================= */

// Variable global para el grupoId activo en recurrente
let _recGrupoId = null;

function _periodoActivoLabel(periodo) {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  if (periodo === 'mensual') {
    return hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase());
  }
  if (periodo === 'trimestral') {
    const q = Math.floor(m / 3) + 1;
    return `T${q} ${y}`;
  }
  if (periodo === 'semestral') {
    return (m < 6 ? '1er' : '2o') + ` semestre ${y}`;
  }
  return `Año ${y}`;
}

function _statusBudget(pct) {
  if (pct >= 100) return { color: '#f87171', text: 'Pago completado' };
  if (pct >= 90)  return { color: '#f87171', text: `Límite crítico alcanzado (${pct}%)` };
  if (pct >= 75)  return { color: '#f97316', text: `Alerta de presupuesto alcanzado (${pct}%)` };
  return { color: '#4ade80', text: 'En camino al objetivo mensual' };
}

async function renderGrupoRecurrente(grupoId) {
  _recGrupoId = grupoId;

  const grupo = gruposManager.obtenerGrupo(grupoId);
  const currentUser = authManager.getCurrentUser();
  const esAdmin = String(grupo.adminId) === String(currentUser.id);

  // Obtener presupuestos con gasto_actual
  let presupuestos = [];
  try {
    const resp = await fetch(`${API_URL}/grupos/${grupoId}/presupuestos`);
    presupuestos = await resp.json();
    if (!Array.isArray(presupuestos)) presupuestos = [];
  } catch (e) {
    console.error('Error cargando presupuestos:', e);
  }

  // Calcular totales
  const totalLimite = presupuestos.reduce((s, p) => s + Number(p.importe), 0);
  const totalGasto  = presupuestos.reduce((s, p) => s + Number(p.gasto_actual), 0);
  const pctGlobal   = totalLimite > 0 ? Math.min(100, Math.round((totalGasto / totalLimite) * 100)) : 0;
  const saldoRestante = Math.max(0, totalLimite - totalGasto);

  // Badge período activo (usa el primer presupuesto o mensual por defecto)
  const periodoLabel = _periodoActivoLabel(presupuestos[0]?.periodo || 'mensual');
  const diasRestantes = presupuestos[0]?.dias_restantes ?? 0;

  // Color del anillo global
  const { color: colorGlobal, text: statusGlobal } = _statusBudget(pctGlobal);
  const gradiente = `conic-gradient(${colorGlobal} ${pctGlobal * 3.6}deg, var(--surface-high) 0deg)`;

  // Generar tarjetas
  const cardsHtml = presupuestos.map(p => {
    const pct = p.importe > 0 ? Math.min(100, Math.round((p.gasto_actual / p.importe) * 100)) : 0;
    const { color, text: statusTxt } = _statusBudget(pct);
    return `
      <div class="rec-budget-card" onclick="renderDetallePresupuesto(${p.id_presupuesto}, '${grupoId}')" style="cursor:pointer">
        <div class="rec-card-header">
          <div class="rec-card-icon-wrap"><i class="fas ${escapeHtml(p.icono || 'fa-receipt')}"></i></div>
          <div style="flex:1; margin-left:0.75rem">
            <div class="rec-card-name">${escapeHtml(p.nombre)}</div>
            <div class="rec-card-dias">${p.dias_restantes} días restantes</div>
          </div>
          <button class="rec-card-menu-btn" data-menu="${p.id_presupuesto}" onclick="event.stopPropagation()">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="rec-card-menu" id="menu-${p.id_presupuesto}">
            <button class="rec-card-menu-item" onclick="abrirEditarPresupuesto(${p.id_presupuesto})">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="rec-card-menu-item danger" onclick="eliminarPresupuesto(${p.id_presupuesto})">
              <i class="fas fa-trash"></i> Eliminar
            </button>
          </div>
        </div>
        <div class="rec-card-amounts">
          <strong>€${Number(p.gasto_actual).toFixed(2)}</strong> / €${Number(p.importe).toFixed(2)}
        </div>
        <div class="rec-progress-bar-wrap">
          <div class="rec-progress-bar" style="width:${pct}%; background:${color}"></div>
        </div>
        <div class="rec-card-status" style="color:${color}">${escapeHtml(statusTxt)}</div>
      </div>`;
  }).join('');

  // Tarjeta añadir
  const addCard = `
    <button class="rec-add-card" onclick="abrirCrearPresupuesto()">
      <i class="fas fa-plus"></i>
      <span>Añadir Categoría</span>
    </button>`;

  // Construir HTML completo del detalleGrupo
  const container = document.getElementById('detalleGrupo');
  container.innerHTML = `
    <!-- Cabecera grupo recurrente -->
    <div class="grupo-detalle-hero">
      <div class="grupo-detalle-hero-top">
        <button class="btn-back" onclick="if(window._recMenuCloseHandler){document.removeEventListener('click',window._recMenuCloseHandler);window._recMenuCloseHandler=null;}switchView('grupos');document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.getAttribute('data-view')==='grupos'))">
          <i class="fas fa-arrow-left"></i> Volver
        </button>
        <span class="grupo-detalle-overline">GRUPO RECURRENTE</span>
      </div>
      <div class="grupo-detalle-title-row">
        <div class="grupo-detalle-title-left">
          <h2>${escapeHtml(grupo.nombre)}</h2>
          <span class="badge-divisa">${escapeHtml(grupo.divisa)}</span>
          <span class="badge-periodo">${escapeHtml(periodoLabel)}</span>
        </div>
      </div>
      <p class="grupo-detalle-desc">${escapeHtml(grupo.descripcion || 'Sin descripción')}</p>
    </div>

    <!-- Barra de acciones (igual que grupos clásicos) -->
    <div class="grupo-actions-bar">
      <div class="grupo-actions-left">
        ${esAdmin ? `
          <button class="btn-secondary" onclick="abrirMiembrosGrupo('${grupoId}')">
            <i class="fas fa-user-plus"></i> Añadir miembros
          </button>
          <button class="btn-secondary" onclick="abrirModalEditarGrupo('${grupoId}')">
            <i class="fas fa-edit"></i> Editar grupo
          </button>` : ''}
      </div>
      <div class="grupo-actions-right">
        ${esAdmin ? `
          <button class="btn-danger" onclick="eliminarGrupo('${grupoId}')">
            <i class="fas fa-trash"></i> Eliminar grupo
          </button>` : `
          <button class="btn-danger" onclick="salirDelGrupo('${grupoId}')">
            <i class="fas fa-sign-out-alt"></i> Salir del grupo
          </button>`}
      </div>
    </div>

    <!-- Tabs -->
    <div class="rec-tabs">
      <button class="rec-tab active" id="recTabPresupuestos" onclick="recSwitchTab('presupuestos', '${grupoId}')">
        <i class="fas fa-wallet"></i> Presupuestos
      </button>
      <button class="rec-tab" id="recTabEstadisticas" onclick="recSwitchTab('estadisticas', '${grupoId}')">
        <i class="fas fa-chart-bar"></i> Estadísticas
      </button>
    </div>

    <!-- Panel presupuestos -->
    <div class="rec-layout" id="recPanelPresupuestos">
          <div class="rec-top-row">
            <div class="rec-global-card">
              <div class="rec-ring" style="background: conic-gradient(${colorGlobal} ${pctGlobal * 3.6}deg, var(--surface-high) 0deg)">
                <div class="rec-ring-label" style="background:var(--surface-container); width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-direction:column">
                  <strong>${pctGlobal}%</strong>
                  <span>consumido</span>
                </div>
              </div>
              <div class="rec-global-info">
                <div class="rec-global-title">PRESUPUESTO GLOBAL</div>
                <div class="rec-global-values">
                  <div class="rec-global-val">
                    <span class="rec-global-val-label">TOTAL LÍMITE</span>
                    <span class="rec-global-val-num">€${totalLimite.toFixed(2)}</span>
                  </div>
                  <div class="rec-global-val">
                    <span class="rec-global-val-label">TOTAL GASTADO</span>
                    <span class="rec-global-val-num">€${totalGasto.toFixed(2)}</span>
                  </div>
                  <div class="rec-global-val">
                    <span class="rec-global-val-label">SALDO RESTANTE</span>
                    <span class="rec-global-val-num" style="color:${colorGlobal}">€${saldoRestante.toFixed(2)}</span>
                  </div>
                </div>
                <div class="rec-global-status">${escapeHtml(statusGlobal)}</div>
                <div class="rec-global-dias"><i class="fas fa-clock"></i> ${diasRestantes} días restantes en el ciclo</div>
                <button class="btn-rec-nuevo" onclick="abrirCrearPresupuesto()" style="margin-top:0.75rem">
                  <i class="fas fa-plus"></i> Nuevo Presupuesto
                </button>
              </div>
            </div>
            <div class="rec-top-right">
              <div class="rec-miembros-card">
                <div class="rec-miembros-title">MIEMBROS</div>
                <div class="rec-miembros-list">
                  ${grupo.miembros.map(m => `
                    <div class="rec-miembro-row">
                      <div class="miembro-avatar" style="width:28px;height:28px;font-size:0.7rem" aria-hidden="true">
                        <span class="miembro-avatar-fallback">${escapeHtml(obtenerInicialesNombre(m.nombre))}</span>
                        <img src="${API_URL}/usuarios/${encodeURIComponent(m.id)}/foto" alt="" loading="lazy" onerror="this.remove()">
                      </div>
                      <span class="rec-miembro-nombre">${escapeHtml(m.nombre)}</span>
                      ${m.rol === 'admin' ? '<span class="badge-admin">Admin</span>' : ''}
                      ${m.offline ? '<span class="badge-offline">Offline</span>' : ''}
                    </div>`).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="rec-cards-grid">
            ${cardsHtml}
            ${addCard}
          </div>
        </div>

        <!-- Panel estadísticas (oculto por defecto) -->
        <div id="recPanelEstadisticas" style="display:none"></div>
  `;

  // Menús de 3 puntos en tarjetas
  container.querySelectorAll('.rec-card-menu-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.menu;
      const menu = document.getElementById(`menu-${id}`);
      container.querySelectorAll('.rec-card-menu.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      menu?.classList.toggle('open');
    });
  });

  // Cerrar menús al hacer click fuera — eliminar listener previo si existe
  if (window._recMenuCloseHandler) {
    document.removeEventListener('click', window._recMenuCloseHandler);
  }
  window._recMenuCloseHandler = (e) => {
    if (!e.target.closest('.rec-card-menu') && !e.target.closest('.rec-card-menu-btn')) {
      document.querySelectorAll('.rec-card-menu.open').forEach(m => m.classList.remove('open'));
    }
  };
  document.addEventListener('click', window._recMenuCloseHandler);
}

// Switch de pestañas en grupo recurrente
async function recSwitchTab(tab, grupoId) {
  document.getElementById('recTabPresupuestos')?.classList.toggle('active', tab === 'presupuestos');
  document.getElementById('recTabEstadisticas')?.classList.toggle('active', tab === 'estadisticas');
  document.getElementById('recPanelPresupuestos').style.display = tab === 'presupuestos' ? '' : 'none';
  const panelEst = document.getElementById('recPanelEstadisticas');
  panelEst.style.display = tab === 'estadisticas' ? '' : 'none';
  if (tab === 'estadisticas' && panelEst.innerHTML === '') {
    await renderEstadisticasRecurrente(grupoId);
  }
}

// Render vista estadísticas recurrente
async function renderEstadisticasRecurrente(grupoId) {
  const panel = document.getElementById('recPanelEstadisticas');
  panel.innerHTML = `<div class="rec-stats-loading"><i class="fas fa-spinner fa-spin"></i> Cargando estadísticas...</div>`;

  let data;
  try {
    const resp = await fetch(`${API_URL}/grupos/${grupoId}/estadisticas-recurrente`);
    if (!resp.ok) throw new Error();
    data = await resp.json();
  } catch {
    panel.innerHTML = `<div class="rec-stats-loading">No se pudieron cargar las estadísticas.</div>`;
    return;
  }

  const { periodos, breakdown, stats } = data;

  // --- Gráfico de barras (SVG) ---
  const SVG_W = 500, SVG_H = 200, HALF = 80, MID_Y = 90, BAR_W = 32, LABEL_Y = SVG_H - 8;
  const maxDesviacion = Math.max(...periodos.map(p => Math.abs(p.presupuestado - p.gastado)), 1);
  const n = periodos.length;
  const slotW = n > 0 ? SVG_W / n : SVG_W;

  const svgBars = periodos.map((p, i) => {
    const cx = slotW * i + slotW / 2;
    const desviacion = p.presupuestado - p.gastado;
    const barH = Math.max(4, Math.round((Math.abs(desviacion) / maxDesviacion) * HALF));
    const ahorro = desviacion >= 0;
    const rectX = cx - BAR_W / 2;
    const rectY = ahorro ? MID_Y - barH : MID_Y;
    const color = ahorro ? '#34d399' : '#f87171';
    const rx = 4;
    const labelColor = p.esActual ? '#4f87f5' : '#888';
    const fontWeight = p.esActual ? 'bold' : 'normal';
    return `
      <rect x="${rectX}" y="${rectY}" width="${BAR_W}" height="${barH}" fill="${color}" rx="${rx}" style="cursor:pointer">
        <title>${ahorro ? `Restante: €${desviacion.toFixed(2)} de €${p.presupuestado.toFixed(2)}` : `Excedido: €${Math.abs(desviacion).toFixed(2)} sobre €${p.presupuestado.toFixed(2)}`}</title>
      </rect>
      <text x="${cx}" y="${LABEL_Y}" text-anchor="middle" font-size="11" fill="${labelColor}" font-weight="${fontWeight}" font-family="sans-serif">${escapeHtml(p.label)}</text>`;
  }).join('');

  const barsHtml = n === 0
    ? `<p style="color:var(--on-surface-muted);font-size:0.85rem;text-align:center;padding:2rem">Sin actividad registrada aún</p>`
    : `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" width="100%" height="${SVG_H}" xmlns="http://www.w3.org/2000/svg">
        <!-- Línea central = presupuesto -->
        <line x1="0" y1="${MID_Y}" x2="${SVG_W}" y2="${MID_Y}" stroke="#666" stroke-width="1.5" stroke-dasharray="4,3"/>
        <text x="4" y="${MID_Y - 5}" font-size="10" fill="#666" font-family="sans-serif">€${periodos[0]?.presupuestado ?? 0}</text>
        ${svgBars}
      </svg>`;

  // --- Historial de períodos ---
  const cerrados = periodos.filter(p => !p.esActual).slice(-5).reverse();
  const histHtml = cerrados.map(p => {
    const excedido = p.surplus < 0;
    const color = excedido ? '#f87171' : '#34d399';
    const barPct = excedido ? 100 : Math.min(100, Math.round((p.surplus / p.presupuestado) * 100));
    const signo = excedido ? '-' : '+';
    return `
      <div class="rec-hist-row">
        <div class="rec-hist-row-top">
          <span class="rec-hist-label">${escapeHtml(p.label)}</span>
          <span style="color:${color};font-weight:700;font-size:0.9rem;">${signo}€${Math.abs(p.surplus).toFixed(2)}</span>
        </div>
        <div style="width:100%;height:6px;background:#2a2d35;border-radius:3px;margin-top:2px;">
          <div style="width:${barPct}%;height:100%;background:${color};border-radius:3px;transition:width 0.4s;"></div>
        </div>
      </div>`;
  }).join('') || `<p style="color:#888; font-size:0.85rem; text-align:center; padding:1rem">Sin períodos cerrados aún</p>`;

  // --- Donut breakdown (por importe de presupuesto, no por gasto) ---
  const PALETTE = ['#4f87f5','#34d399','#f59e0b','#f87171','#a78bfa','#fb923c'];
  const totalImporte = breakdown.reduce((s, b) => s + b.importe, 0) || 1;
  let conicParts = '', startDeg = 0;
  breakdown.forEach((b, i) => {
    const pct = totalImporte > 0 ? b.importe / totalImporte * 100 : 0;
    const deg = Math.round(pct * 3.6);
    conicParts += `${PALETTE[i % PALETTE.length]} ${startDeg}deg ${startDeg + deg}deg, `;
    startDeg += deg;
  });
  conicParts += `var(--surface-high) ${startDeg}deg`;
  const donutLegend = breakdown.map((b, i) => {
    const pct = Math.round(b.importe / totalImporte * 100);
    return `
    <div class="rec-donut-legend-item">
      <span class="rec-donut-dot" style="background:${PALETTE[i % PALETTE.length]}"></span>
      <span class="rec-donut-legend-name">${escapeHtml(b.nombre)}</span>
      <span class="rec-donut-legend-pct">${pct}% · €${b.importe.toFixed(0)}</span>
    </div>`;
  }).join('');

  // --- Recomendación automática ---
  const peorCat = breakdown.reduce((w, b) => (!w || b.gastado / (b.importe || 1) > w.gastado / (w.importe || 1)) ? b : w, null);
  const recomendacion = peorCat && peorCat.importe > 0 && (peorCat.gastado / peorCat.importe) > 0.8
    ? `Tu categoría <strong>${escapeHtml(peorCat.nombre)}</strong> ha consumido el ${Math.round((peorCat.gastado / peorCat.importe) * 100)}% del presupuesto. Considera ajustar el límite o reducir gastos en esta categoría.`
    : `Tus presupuestos están bien distribuidos. Sigue así para mantener un buen control financiero.`;

  const periodoLabel = { mensual: 'Mensual', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' }[stats.periodo] || stats.periodo;

  panel.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1rem;">

      <!-- Fila superior: barras + donut -->
      <div style="display:flex;gap:1rem;align-items:stretch;">

        <!-- Gráfico barras -->
        <div class="rec-stats-card" style="flex:1;min-width:0;width:50%;display:flex;flex-direction:column;">
          <div class="rec-stats-card-header">
            <span class="rec-stats-card-title">Budget Health Chart</span>
            <div class="rec-bar-legend">
              <span class="rec-bar-legend-dot surplus"></span> Dentro del presupuesto
              <span class="rec-bar-legend-dot over" style="margin-left:1rem"></span> Excedido
            </div>
          </div>
          <div class="rec-bar-chart">${barsHtml}</div>
        </div>

        <!-- Donut -->
        <div class="rec-stats-card" style="flex:1;min-width:0;width:50%;display:flex;flex-direction:column;justify-content:center;">
          <div class="rec-stats-card-title" style="margin-bottom:1rem">Distribución del presupuesto</div>
          <div class="rec-donut-row">
            <div class="rec-donut" style="background: conic-gradient(${conicParts})">
              <div class="rec-donut-inner">
                <div class="rec-donut-total-label">TOTAL</div>
                <div class="rec-donut-total-val">€${totalImporte >= 1000 ? (totalImporte / 1000).toFixed(1) + 'k' : totalImporte.toFixed(0)}</div>
              </div>
            </div>
            <div class="rec-donut-legend">${donutLegend}</div>
          </div>
        </div>

      </div>

      <!-- Historial debajo -->
      <div class="rec-stats-card">
        <div class="rec-stats-card-title">Historial de Períodos</div>
        <div class="rec-stats-card-sub">Últimos ciclos completados</div>
        <div class="rec-hist-list">${histHtml}</div>
      </div>

    </div>
  `;
}

// Vista de detalle de un presupuesto
async function renderDetallePresupuesto(idPresupuesto, grupoId) {
  let data;
  try {
    const resp = await fetch(`${API_URL}/presupuestos/${idPresupuesto}/transacciones`);
    if (!resp.ok) throw new Error('Error al cargar');
    data = await resp.json();
  } catch (e) {
    showPopup('No se pudo cargar el detalle', 'error');
    return;
  }

  const p = data.presupuesto;
  const txs = data.transacciones;
  const pct = p.importe > 0 ? Math.min(100, Math.round((p.gasto_actual / p.importe) * 100)) : 0;
  const restante = Math.max(0, Number(p.importe) - Number(p.gasto_actual));
  const { color } = _statusBudget(pct);
  const currentUser = authManager.getCurrentUser();
  const grupo = gruposManager.obtenerGrupo(grupoId);
  const esAdmin = String(grupo?.adminId) === String(currentUser.id);
  const divisa = grupo?.divisa || 'EUR';

  // Etiqueta del período
  const periodoDate = new Date(data.periodo.inicio + 'T12:00:00');
  const periodoLabel = periodoDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const periodoCapitalizado = periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1);

  // Normalizar transacciones al formato que espera renderTransaccionItem
  const txsNorm = txs.map(t => ({
    id: String(t.id_transaccion),
    grupoId: String(t.id_grupo || grupoId),
    tipo: t.tipo,
    estado: t.estado,
    concepto: t.concepto,
    monto: Number(t.monto),
    pagadorId: String(t.id_pagador || ''),
    pagadorNombre: t.nombre_pagador,
    fecha: t.fecha_transaccion || t.fecha_creacion,
    tieneImagen: !!t.tiene_imagen,
    participantes: (t.participantes || []).map(p => ({
      id_usuario: p.id_usuario,
      monto_debe: Number(p.monto_debe),
      pagado: !!p.pagado,
      usuario_nombre: p.usuario_nombre
    }))
  }));

  const emptyHtml = txsNorm.length === 0 ? `
    <div class="rec-det-empty">
      <i class="fas fa-receipt" style="font-size:2.5rem; opacity:0.3; margin-bottom:0.75rem"></i>
      <p>Sin gastos en este período</p>
    </div>` : '';

  const container = document.getElementById('detalleGrupo');
  container.innerHTML = `
    <div class="rec-det-header">
      <button class="btn-back" id="btnBackFromDet">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div class="rec-det-header-info">
        <h2>${escapeHtml(p.nombre)}</h2>
        <span class="rec-det-periodo">${periodoCapitalizado}</span>
      </div>
    </div>

    <div class="rec-det-top-grid">
      <div class="rec-det-card rec-det-card-main">
        <div class="rec-det-card-label">TOTAL RESTANTE</div>
        <div class="rec-det-card-value">€${restante.toFixed(2)}</div>
        <div class="rec-det-budget-line">
          <span>Presupuesto: €${Number(p.importe).toFixed(2)}</span>
          <span style="color:${color}">${pct}% consumido</span>
        </div>
        <div class="rec-progress-bar-wrap">
          <div class="rec-progress-bar" style="width:${pct}%; background:${color}"></div>
        </div>
      </div>

      <div class="rec-det-right-col">
        <div class="rec-det-card rec-det-card-stat">
          <div class="rec-det-stat-icon"><i class="fas fa-chart-line" style="color:var(--accent-green)"></i></div>
          <div>
            <div class="rec-det-card-label">Gasto Diario Promedio</div>
            <div class="rec-det-card-value">€${Number(data.gasto_diario_promedio).toFixed(2)}</div>
          </div>
        </div>
        <button class="rec-det-btn-add" onclick="abrirModalGastoRecurrente('${grupoId}', ${idPresupuesto})">
          <i class="fas fa-plus-circle"></i> Añadir Gasto
        </button>
      </div>
    </div>

    <div class="rec-det-actividad-title">Actividad Reciente</div>

    <div class="tx-list rec-det-tx-list" id="recDetTxList">
      ${txsNorm.map(t => renderTransaccionItem(t, grupoId, esAdmin, currentUser, divisa)).join('')}
      ${emptyHtml}
    </div>
  `;

  container.scrollTop = 0;

  window._recDetRefresh = () => renderDetallePresupuesto(idPresupuesto, grupoId);

  document.getElementById('btnBackFromDet').onclick = async () => {
    window._recDetRefresh = null;
    await renderGrupoRecurrente(grupoId);
  };
}

// Abrir modal para crear presupuesto
function abrirCrearPresupuesto() {
  document.getElementById('modalCrearPresupuestoTitle').textContent = 'Nuevo Presupuesto';
  document.getElementById('editPresupuestoId').value = '';
  document.getElementById('presupuestoNombre').value = '';
  document.getElementById('presupuestoImporte').value = '';
  document.getElementById('presupuestoPeriodo').value = 'mensual';
  document.getElementById('presupuestoFechaInicio').value = new Date().toISOString().slice(0, 10);
  document.getElementById('presupuestoIcono').value = 'fa-utensils';
  document.querySelectorAll('.rec-icon-option').forEach(b => b.classList.remove('active'));
  document.querySelector('.rec-icon-option[data-icon="fa-utensils"]')?.classList.add('active');
  document.getElementById('btnSubmitPresupuesto').innerHTML = '<i class="fas fa-plus"></i> Guardar';
  openModal('modalCrearPresupuesto');
}

// Abrir modal para editar presupuesto
async function abrirEditarPresupuesto(id) {
  // Cerrar menús abiertos
  document.querySelectorAll('.rec-card-menu.open').forEach(m => m.classList.remove('open'));

  // Obtener datos actuales desde el DOM (o re-fetch)
  let p = null;
  try {
    const resp = await fetch(`${API_URL}/grupos/${_recGrupoId}/presupuestos`);
    const lista = await resp.json();
    p = lista.find(x => x.id_presupuesto === id);
  } catch (e) { console.error(e); }

  if (!p) { showPopup('No se pudo cargar el presupuesto', 'error'); return; }

  document.getElementById('modalCrearPresupuestoTitle').textContent = 'Editar Presupuesto';
  document.getElementById('editPresupuestoId').value = id;
  document.getElementById('presupuestoNombre').value = p.nombre;
  document.getElementById('presupuestoImporte').value = Number(p.importe).toFixed(2);
  document.getElementById('presupuestoPeriodo').value = p.periodo;
  document.getElementById('presupuestoFechaInicio').value = p.fecha_inicio ? p.fecha_inicio.slice(0, 10) : '';
  document.getElementById('presupuestoIcono').value = p.icono || 'fa-receipt';
  document.querySelectorAll('.rec-icon-option').forEach(b => b.classList.remove('active'));
  document.querySelector(`.rec-icon-option[data-icon="${p.icono}"]`)?.classList.add('active');
  document.getElementById('btnSubmitPresupuesto').innerHTML = '<i class="fas fa-save"></i> Guardar cambios';
  openModal('modalCrearPresupuesto');
}

// Eliminar presupuesto
async function eliminarPresupuesto(id) {
  document.querySelectorAll('.rec-card-menu.open').forEach(m => m.classList.remove('open'));
  if (!await showConfirmPopup('¿Eliminar este presupuesto? Los gastos asociados no se borrarán.', 'Eliminar', 'danger')) return;
  try {
    const resp = await fetch(`${API_URL}/presupuestos/${id}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Error al eliminar');
    showPopup('Presupuesto eliminado', 'success');
    await renderGrupoRecurrente(_recGrupoId);
  } catch (e) {
    showPopup('Error: ' + e.message, 'error');
  }
}

// Abrir modal de nuevo gasto para grupo recurrente (añade select de presupuesto)
async function abrirModalGastoRecurrente(grupoId, idPresupuesto = null) {
  await abrirModalTransaccionGrupo(grupoId);

  const form = document.getElementById('formTransaccionGrupo');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const selectPagador = document.getElementById('pagadorTransaccion');
    const containerParticipantes = document.getElementById('participantesTransaccion');
    const concepto = document.getElementById('conceptoTransaccionGrupo').value;
    const monto = document.getElementById('montoTransaccionGrupo').value;
    const fecha = document.getElementById('fechaTransaccion').value;
    const pagadorId = selectPagador.value;

    const participantesSeleccionados = Array.from(
      containerParticipantes.querySelectorAll('.participante-row.active')
    ).map(btn => btn.dataset.id);

    if (participantesSeleccionados.length === 0) {
      showPopup('Debes seleccionar al menos un participante', 'warning');
      return;
    }

    const montoPorPersona = Number(monto) / participantesSeleccionados.length;
    const participantes = participantesSeleccionados.map(id => ({
      id_usuario: Number(id),
      monto_debe: montoPorPersona,
      pagado: String(id) === String(pagadorId)
    }));

    try {
      const body = {
        id_grupo: grupoId,
        concepto,
        monto: Number(monto),
        tipo: 'gasto',
        participantes,
        id_pagador: pagadorId,
        id_presupuesto: idPresupuesto ? Number(idPresupuesto) : null
      };
      if (fecha) body.fecha_transaccion = fecha;

      const resp = await fetch(`${API_URL}/transacciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Error'); }
      const resultado = await resp.json();

      const imagenInput = document.getElementById('imagenTransaccion');
      if (imagenInput?.files?.length > 0) {
        const fd = new FormData();
        fd.append('imagen', imagenInput.files[0]);
        await fetch(`${API_URL}/transacciones/${resultado.id_transaccion}/imagen`, { method: 'POST', body: fd });
      }

      closeModal('modalTransaccionGrupo');
      form.reset();
      showPopup('Gasto añadido correctamente', 'success');
      if (idPresupuesto) {
        await renderDetallePresupuesto(idPresupuesto, grupoId);
      } else {
        await renderGrupoRecurrente(grupoId);
      }
    } catch (err) {
      showPopup(err.message, 'error');
    }
  };
}

// Setup del formulario de crear/editar presupuesto (se ejecuta al cargar el DOM)
(function setupPresupuestoModal() {
  // Icon picker
  document.getElementById('iconPickerGrid')?.addEventListener('click', e => {
    const btn = e.target.closest('.rec-icon-option');
    if (!btn) return;
    document.querySelectorAll('.rec-icon-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('presupuestoIcono').value = btn.dataset.icon;
  });

  // Submit
  document.getElementById('formCrearPresupuesto')?.addEventListener('submit', async e => {
    e.preventDefault();
    const idEditar = document.getElementById('editPresupuestoId').value;
    const payload = {
      nombre: document.getElementById('presupuestoNombre').value.trim(),
      importe: document.getElementById('presupuestoImporte').value,
      periodo: document.getElementById('presupuestoPeriodo').value,
      fecha_inicio: document.getElementById('presupuestoFechaInicio').value,
      icono: document.getElementById('presupuestoIcono').value
    };

    try {
      if (idEditar) {
        const resp = await fetch(`${API_URL}/presupuestos/${idEditar}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Error'); }
        showPopup('Presupuesto actualizado', 'success');
      } else {
        const resp = await fetch(`${API_URL}/grupos/${_recGrupoId}/presupuestos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Error'); }
        showPopup('Presupuesto creado', 'success');
      }
      closeModal('modalCrearPresupuesto');
      await renderGrupoRecurrente(_recGrupoId);
    } catch (err) {
      showPopup('Error: ' + err.message, 'error');
    }
  });
})();

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
  const msg = (n.mensaje || "").toLowerCase();
  if (msg.startsWith("[gasto]") || msg.includes("añadió")) return "gasto";
  if (msg.startsWith("[deuda]") || msg.includes("debes")) return "deuda";
  if (msg.startsWith("[actividad]") || msg.includes("añadido al grupo") || msg.includes("unió")) return "actividad";
  return "gasto";
}

function notifInvitacionId(n) {
  const m = (n.mensaje || "").match(/\[invitacion:(\d+)\]/);
  return m ? m[1] : null;
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

  container.innerHTML = visibles.map(n => {
    const invId = notifInvitacionId(n);
    const botonesInvitacion = invId && !n.leida ? `
      <div class="notif-inv-btns">
        <button class="notif-inv-btn accept" onclick="responderInvitacion('${invId}','aceptar','${n.id}')">
          <i class="fas fa-check"></i> Aceptar
        </button>
        <button class="notif-inv-btn decline" onclick="responderInvitacion('${invId}','rechazar','${n.id}')">
          <i class="fas fa-times"></i> Rechazar
        </button>
      </div>` : '';
    const btnLeida = !n.leida && !invId
      ? `<button class="notif-read-btn" onclick="marcarNotificacionLeida('${n.id}')"><i class="fas fa-check"></i> Marcar como leída</button>`
      : '';
    return `
      <div class="notification-item ${n.leida ? 'leida' : 'no-leida'}" data-notif-id="${n.id}">
        <div class="notif-icon-wrap"><i class="fas ${iconoTipo(notifTipo(n))}"></i></div>
        <div class="notif-body">
          <p>${escapeHtml(notifMensajeLimpio(n))}</p>
          <small>${formatearFecha(n.fecha)}</small>
          ${botonesInvitacion}
          ${btnLeida}
        </div>
      </div>`;
  }).join("");
}


async function responderInvitacion(invId, accion, notifId) {
  const currentUser = authManager.getCurrentUser();
  try {
    const res = await fetch(`${API_URL}/invitaciones/${invId}/${accion}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_usuario: currentUser.id })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Error"); }
    await notificationsManager.marcarComoLeida(notifId);
    showPopup(accion === "aceptar" ? "Te has unido al grupo" : "Invitación rechazada", accion === "aceptar" ? "success" : "info");
    await loadNotificaciones();
    await updateNotificationBadge();
    if (accion === "aceptar") await loadGrupos();
  } catch (err) {
    showPopup("Error: " + err.message, "error");
  }
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

// Determina si una transacción está pagada desde el punto de vista del usuario actual:
// - Si el usuario es el PAGADOR → pagada solo cuando todos los participantes han confirmado (completada)
// - Si el usuario es PARTICIPANTE → pagada cuando él ha confirmado su parte
function _txPagadaParaUsuario(tx, currentUser) {
  if (tx.estado === 'completada') return true;
  if (String(tx.pagadorId) === String(currentUser.id)) return false;
  return tx.yoPague === true;
}

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

    // Construir mapa id_transaccion -> monto_debe del usuario actual usando los detalles de grupo
    const miPartePorTx = {};
    for (const grupo of grupos) {
      const detalle = gruposManager.obtenerGrupo(grupo.id);
      if (!detalle) continue;
      for (const tx of (detalle.transacciones || [])) {
        const part = (tx.participantes || []).find(p => String(p.id_usuario) === String(currentUser.id));
        if (part) miPartePorTx[String(tx.id)] = Number(part.monto_debe || 0);
      }
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
          return f.getFullYear() === m.year && f.getMonth() === m.month;
        })
        .reduce((sum, t) => {
          // Si soy el pagador, mi "parte" es lo que pagué de mi propio bolsillo (mi participación)
          if (String(t.pagadorId) === String(currentUser.id)) {
            return sum + (miPartePorTx[String(t.id)] || 0);
          }
          // Si soy participante, uso el monto_debe
          return sum + (miPartePorTx[String(t.id)] || 0);
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
        const miParte = miPartePorTx[String(t.id)] ?? 0;
        // Pagador: lo que puso de su bolsillo (su propia parte), positivo porque lo adelantó
        // Participante: lo que debe pagar, negativo porque es deuda
        const parteClass = esPagador ? 'pos' : 'neg';
        const parteLabel = esPagador ? `+${formatEur(miParte)}` : `-${formatEur(miParte)}`;
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
            <td><span class="st-tx-badge ${_txPagadaParaUsuario(t, currentUser) ? 'pagada' : 'pendiente'}">${_txPagadaParaUsuario(t, currentUser) ? window.t('stats_badge_paid') : window.t('stats_badge_pending')}</span></td>
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
