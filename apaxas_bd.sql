CREATE DATABASE IF NOT EXISTS apaxas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE apaxas;

--  USUARIO
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    nombre              VARCHAR(100)     NOT NULL,
    nombre_usuario      VARCHAR(60)      NOT NULL UNIQUE,
    correo_electronico  VARCHAR(150)     UNIQUE,
    hash_contrasena     VARCHAR(255)     NOT NULL DEFAULT '',
    fecha_registro      DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    fecha_ultimo_acceso DATETIME(3)      NULL,
    -- Perfil / suscripción
    offline             TINYINT(1)       NOT NULL DEFAULT 0,   -- 1 = usuario virtual sin cuenta
    premium             TINYINT(1)       NOT NULL DEFAULT 0,
    premium_hasta       DATETIME         NULL,
    stripe_customer_id  VARCHAR(100)     NULL,
    stripe_sub_id       VARCHAR(100)     NULL,
    PRIMARY KEY (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--  GRUPO
CREATE TABLE IF NOT EXISTS grupo (
    id_grupo        INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(100)     NOT NULL,
    descripcion     TEXT             NULL,
    divisa          CHAR(3)          NOT NULL DEFAULT 'EUR',
    id_admin        INT UNSIGNED     NOT NULL,
    tipo            VARCHAR(20)      NOT NULL DEFAULT 'clasico',
    fecha_creacion  DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id_grupo),
    CONSTRAINT fk_grupo_admin FOREIGN KEY (id_admin) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--  MIEMBRO_GRUPO
CREATE TABLE IF NOT EXISTS miembro_grupo (
    id_grupo    INT UNSIGNED                   NOT NULL,
    id_usuario  INT UNSIGNED                   NOT NULL,
    rol         ENUM('admin','miembro')        NOT NULL DEFAULT 'miembro',
    fecha_union DATETIME(3)                    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id_grupo, id_usuario),
    CONSTRAINT fk_mg_grupo   FOREIGN KEY (id_grupo)   REFERENCES grupo   (id_grupo)   ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_mg_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--  INVITACION_GRUPO
CREATE TABLE IF NOT EXISTS invitacion_grupo (
    id_invitacion   INT UNSIGNED                            NOT NULL AUTO_INCREMENT,
    id_grupo        INT UNSIGNED                            NOT NULL,
    id_usuario      INT UNSIGNED                            NOT NULL,
    id_invitador    INT UNSIGNED                            NOT NULL,
    estado          ENUM('pendiente','aceptada','rechazada') NOT NULL DEFAULT 'pendiente',
    fecha_creacion  DATETIME(3)                             NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id_invitacion),
    CONSTRAINT fk_inv_grupo     FOREIGN KEY (id_grupo)    REFERENCES grupo   (id_grupo)   ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_inv_usuario   FOREIGN KEY (id_usuario)  REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_inv_invitador FOREIGN KEY (id_invitador) REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--  PRESUPUESTO
CREATE TABLE IF NOT EXISTS presupuesto (
    id_presupuesto  INT UNSIGNED                                    NOT NULL AUTO_INCREMENT,
    id_grupo        INT UNSIGNED                                    NOT NULL,
    nombre          VARCHAR(100)                                    NOT NULL,
    importe         DECIMAL(12,2)                                   NOT NULL,
    periodo         ENUM('mensual','trimestral','semestral','anual') NOT NULL DEFAULT 'mensual',
    fecha_inicio    DATE                                            NOT NULL,
    icono           VARCHAR(50)                                     NOT NULL DEFAULT 'fa-receipt',
    activo          TINYINT(1)                                      NOT NULL DEFAULT 1,
    PRIMARY KEY (id_presupuesto),
    CONSTRAINT fk_pres_grupo FOREIGN KEY (id_grupo) REFERENCES grupo (id_grupo) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--  TRANSACCION
CREATE TABLE IF NOT EXISTS transaccion (
    id_transaccion      INT UNSIGNED                    NOT NULL AUTO_INCREMENT,
    id_grupo            INT UNSIGNED                    NOT NULL,
    tipo                ENUM('gasto','pago','ajuste')   NOT NULL DEFAULT 'gasto',
    estado              ENUM('pendiente','completada')  NOT NULL DEFAULT 'pendiente',
    concepto            VARCHAR(200)                    NOT NULL,
    monto               DECIMAL(12,2)                   NOT NULL,
    id_pagador          INT UNSIGNED                    NOT NULL,
    id_receptor         INT UNSIGNED                    NULL,
    id_presupuesto      INT UNSIGNED                    NULL,
    fecha_transaccion   DATE                            NULL,          -- fecha real del gasto (opcional)
    fecha_creacion      DATETIME(3)                     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id_transaccion),
    CONSTRAINT fk_tx_grupo       FOREIGN KEY (id_grupo)       REFERENCES grupo       (id_grupo)       ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_tx_pagador     FOREIGN KEY (id_pagador)     REFERENCES usuario     (id_usuario)     ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_tx_receptor    FOREIGN KEY (id_receptor)    REFERENCES usuario     (id_usuario)     ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_tx_presupuesto FOREIGN KEY (id_presupuesto) REFERENCES presupuesto (id_presupuesto) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--  PARTICIPANTE_TRANSACCION
CREATE TABLE IF NOT EXISTS participante_transaccion (
    id_transaccion  INT UNSIGNED    NOT NULL,
    id_usuario      INT UNSIGNED    NOT NULL,
    monto_debe      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    pagado          TINYINT(1)      NOT NULL DEFAULT 0,
    fecha_pago      DATETIME(3)     NULL,
    PRIMARY KEY (id_transaccion, id_usuario),
    CONSTRAINT fk_pt_transaccion FOREIGN KEY (id_transaccion) REFERENCES transaccion (id_transaccion) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pt_usuario     FOREIGN KEY (id_usuario)     REFERENCES usuario     (id_usuario)     ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--  NOTIFICACION
CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    id_usuario      INT UNSIGNED     NOT NULL,
    mensaje         TEXT             NOT NULL,
    tipo            VARCHAR(30)      NOT NULL DEFAULT 'info',   -- 'actividad', 'gasto', 'deuda', 'info'
    leida           TINYINT(1)       NOT NULL DEFAULT 0,
    fecha_creacion  DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id_notificacion),
    CONSTRAINT fk_notif_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--  LOG_GRUPO
CREATE TABLE IF NOT EXISTS log_grupo (
    id_log      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_grupo    INT UNSIGNED    NOT NULL,
    id_usuario  INT UNSIGNED    NOT NULL,
    tipo_accion VARCHAR(50)     NOT NULL,   -- 'grupo_creado', 'miembro_añadido', 'gasto_creado', etc.
    descripcion TEXT            NOT NULL,
    fecha       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id_log),
    CONSTRAINT fk_log_grupo   FOREIGN KEY (id_grupo)   REFERENCES grupo   (id_grupo)   ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_log_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--  ÍNDICES

CREATE INDEX idx_miembro_usuario        ON miembro_grupo          (id_usuario);
CREATE INDEX idx_inv_usuario_estado     ON invitacion_grupo       (id_usuario, estado);
CREATE INDEX idx_tx_grupo_fecha         ON transaccion            (id_grupo, fecha_creacion);
CREATE INDEX idx_pt_usuario             ON participante_transaccion (id_usuario);
CREATE INDEX idx_notif_usuario_leida    ON notificacion           (id_usuario, leida);
CREATE INDEX idx_log_grupo_fecha        ON log_grupo              (id_grupo, fecha);
