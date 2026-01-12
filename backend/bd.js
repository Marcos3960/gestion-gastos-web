// bd.js - Pool de conexión MySQL/MariaDB (XAMPP)
import mysql from "mysql2/promise";
import "dotenv/config";

export const poolBD = mysql.createPool({
    host: process.env.BD_HOST || "127.0.0.1",
    port: Number(process.env.BD_PUERTO || 3306),
    user: process.env.BD_USUARIO || "root",
    password: process.env.BD_CONTRASENA || "",
    database: process.env.BD_NOMBRE || "apaxas",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
