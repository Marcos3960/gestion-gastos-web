// auth.js - Gestión de autenticación
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Cargar usuario actual del localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
    }

    register(nombre, email, password) {
        // Obtener usuarios existentes
        const users = this.getUsers();

        // Verificar si el email ya existe
        if (users.find(u => u.email === email)) {
            throw new Error('El email ya está registrado');
        }

        // Crear nuevo usuario
        const newUser = {
            id: Date.now().toString(),
            nombre,
            email,
            password: btoa(password), // Codificación básica (en producción usar hash real)
            fechaRegistro: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        return newUser;
    }

    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === btoa(password));

        if (!user) {
            throw new Error('Credenciales incorrectas');
        }

        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));

        return user;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUsers() {
        const users = localStorage.getItem('users');
        return users ? JSON.parse(users) : [];
    }

    getUserByEmail(email) {
        const users = this.getUsers();
        return users.find(u => u.email === email);
    }
}

const authManager = new AuthManager();
