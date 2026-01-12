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

    async register(nombre, email, password) {
        const resp = await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre,
                correo_electronico: email,
                contrasena: password
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "El email ya está registrado");
        }

        return true;
    }

    async login(email, password) {
        const resp = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                correo_electronico: email,
                contrasena: password
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "Credenciales incorrectas");
        }

        const u = await resp.json();

        // Mantener compatibilidad con tu app: {id, nombre, email} [file:110]
        const userFront = {
            id: String(u.id_usuario),
            nombre: u.nombre,
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
}

const authManager = new AuthManager();
