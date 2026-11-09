BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TYPE "CanalMensajes" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK');
CREATE TYPE "EstadoMensajeCanal" AS ENUM ('RECIBIDO', 'ENVIANDO', 'ENVIADO', 'ERROR', 'INCIERTO');

CREATE TABLE "ConexionCanal" (
    "id" TEXT PRIMARY KEY,
    "canal" "CanalMensajes" NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "usuarioCanal" TEXT NOT NULL,
    "tokenCifrado" TEXT,
    "expiraAt" TIMESTAMPTZ(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "estudioId" TEXT REFERENCES "Estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "artistaId" TEXT REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConexionCanal_negocio_check" CHECK (num_nonnulls("estudioId", "artistaId") = 1)
);
CREATE UNIQUE INDEX "ConexionCanal_canal_cuentaId_key" ON "ConexionCanal"("canal", "cuentaId");
CREATE UNIQUE INDEX "ConexionCanal_canal_estudioId_key" ON "ConexionCanal"("canal", "estudioId");
CREATE UNIQUE INDEX "ConexionCanal_canal_artistaId_key" ON "ConexionCanal"("canal", "artistaId");

CREATE TABLE "ConversacionCanal" (
    "id" TEXT PRIMARY KEY,
    "canal" "CanalMensajes" NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "remitente" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estudioId" TEXT REFERENCES "Estudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "artistaId" TEXT REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "solicitudId" TEXT REFERENCES "Solicitud"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "ultimaEntradaAt" TIMESTAMPTZ(3) NOT NULL,
    "ultimaActividad" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ConversacionCanal_negocio_check" CHECK (num_nonnulls("estudioId", "artistaId") = 1)
);
CREATE UNIQUE INDEX "ConversacionCanal_canal_cuentaId_remitente_key" ON "ConversacionCanal"("canal", "cuentaId", "remitente");
CREATE INDEX "ConversacionCanal_estudioId_ultimaActividad_idx" ON "ConversacionCanal"("estudioId", "ultimaActividad");
CREATE INDEX "ConversacionCanal_artistaId_ultimaActividad_idx" ON "ConversacionCanal"("artistaId", "ultimaActividad");

CREATE TABLE "MensajeCanal" (
    "id" TEXT PRIMARY KEY,
    "conversacionId" TEXT NOT NULL REFERENCES "ConversacionCanal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "proveedorId" TEXT,
    "claveEnvio" TEXT UNIQUE,
    "texto" TEXT NOT NULL,
    "propio" BOOLEAN NOT NULL,
    "estado" "EstadoMensajeCanal" NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL,
    "leidoAt" TIMESTAMPTZ(3)
);
CREATE UNIQUE INDEX "MensajeCanal_conversacionId_proveedorId_key" ON "MensajeCanal"("conversacionId", "proveedorId");
CREATE INDEX "MensajeCanal_conversacionId_fecha_idx" ON "MensajeCanal"("conversacionId", "fecha");

ALTER TABLE "ConexionCanal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversacionCanal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MensajeCanal" ENABLE ROW LEVEL SECURITY;
COMMIT;
