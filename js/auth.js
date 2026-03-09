// auth.js - Gestión de autenticación (API Node/Express + MySQL)

const API_URL = "http://localhost:3000/api";

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        const savedUser = localStorage.getItem("currentUser");
        if (savedUser) this.currentUser = JSON.parse(savedUser);
    }

    async register(nombre, nombreUsuario, email, password) {
        const resp = await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre,
                nombre_usuario: nombreUsuario,
                correo_electronico: email,
                contrasena: password
            })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "El email o nombre de usuario ya está registrado");
        }
        return true;
    }

    async login(identifier, password) {
        const resp = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identificador: identifier,
                contrasena: password
            })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "Credenciales incorrectas");
        }

        const u = await resp.json();
        const userFront = {
            id: String(u.id_usuario),
            nombre: u.nombre,
            nombreUsuario: u.nombre_usuario,
            email: u.correo_electronico
        };
        this.currentUser = userFront;
        localStorage.setItem("currentUser", JSON.stringify(userFront));
        return userFront;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem("currentUser");
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async actualizarPerfil(nombre, nombreUsuario, email, password) {
        const currentUser = this.getCurrentUser();
        const body = {};
        if (nombre) body.nombre = nombre;
        if (nombreUsuario) body.nombre_usuario = nombreUsuario;
        if (email) body.correo_electronico = email;
        if (password) body.contrasena = password;

        const resp = await fetch(`${API_URL}/usuarios/${encodeURIComponent(currentUser.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "No se pudo actualizar el perfil");
        }

        const updated = await resp.json();

        // Actualizar localStorage
        const userFront = {
            id: String(updated.id_usuario),
            nombre: updated.nombre,
            nombreUsuario: updated.nombre_usuario,
            email: updated.correo_electronico
        };
        this.currentUser = userFront;
        localStorage.setItem("currentUser", JSON.stringify(userFront));

        return true;
    }

    async refrescarUsuario() {
        const current = this.currentUser;
        if (!current) return;
        try {
            const resp = await fetch(`${API_URL}/usuarios/${encodeURIComponent(current.id)}`);
            if (!resp.ok) return;
            const u = await resp.json();
            const userFront = {
                id: String(u.id_usuario),
                nombre: u.nombre,
                nombreUsuario: u.nombre_usuario,
                email: u.correo_electronico
            };
            this.currentUser = userFront;
            localStorage.setItem("currentUser", JSON.stringify(userFront));
        } catch (_) {}
    }

    async obtenerTodosUsuarios() {
        const resp = await fetch(`${API_URL}/usuarios`);
        if (!resp.ok) throw new Error("No se pudieron cargar usuarios");
        return await resp.json();
    }
}

const authManager = new AuthManager();
