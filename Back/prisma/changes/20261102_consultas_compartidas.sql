BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TYPE "EstadoSolicitud" ADD VALUE IF NOT EXISTS 'POR_ASIGNAR';
ALTER TYPE "EstadoSolicitud" ADD VALUE IF NOT EXISTS 'ELECCION_CLIENTE';
ALTER TYPE "EstadoSolicitud" ADD VALUE IF NOT EXISTS 'ASIGNADA';
ALTER TYPE "EstadoSolicitud" ADD VALUE IF NOT EXISTS 'ARCHIVADA';
DO $$ BEGIN
  CREATE TYPE "CanalConsulta" AS ENUM ('WEB','INSTAGRAM','WHATSAPP','TIKTOK','FACEBOOK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "EstadoArtistaEstudio" AS ENUM ('ACTIVO','SUSPENDIDO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "estadoEnEstudio" "EstadoArtistaEstudio" NOT NULL DEFAULT 'ACTIVO';
ALTER TABLE "Estudio" ADD COLUMN IF NOT EXISTS "plazoPropuestasHoras" INTEGER NOT NULL DEFAULT 48;

CREATE TABLE IF NOT EXISTS "Contacto" (
  "id" TEXT PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "telefono" TEXT,
  "ciudad" TEXT,
  "notas" TEXT NOT NULL DEFAULT '',
  "estudioId" TEXT REFERENCES "Estudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "artistaId" TEXT REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contacto_ambito_check" CHECK (num_nonnulls("estudioId","artistaId") = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Contacto_estudioId_email_key" ON "Contacto"("estudioId","email");
CREATE UNIQUE INDEX IF NOT EXISTS "Contacto_artistaId_email_key" ON "Contacto"("artistaId","email");
ALTER TABLE "Contacto" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Solicitud" ALTER COLUMN "clienteId" DROP NOT NULL;
ALTER TABLE "Solicitud"
  ADD COLUMN IF NOT EXISTS "contactoId" TEXT REFERENCES "Contacto"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS "artistaDestinoId" TEXT REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS "artistaAsignadoId" TEXT REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS "titulo" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "canal" "CanalConsulta" NOT NULL DEFAULT 'WEB',
  ADD COLUMN IF NOT EXISTS "tamano" TEXT,
  ADD COLUMN IF NOT EXISTS "presupuestoMinimo" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "presupuestoMaximo" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "moneda" TEXT NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS "notas" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "cierrePropuestasAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cerradaAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "asignadaPor" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Solicitud_estudioId_estado_idx" ON "Solicitud"("estudioId","estado");
CREATE INDEX IF NOT EXISTS "Solicitud_artistaDestinoId_estado_idx" ON "Solicitud"("artistaDestinoId","estado");
CREATE INDEX IF NOT EXISTS "Solicitud_estado_cierrePropuestasAt_idx" ON "Solicitud"("estado","cierrePropuestasAt");

ALTER TABLE "Cotizacion"
  ALTER COLUMN "monto" TYPE DECIMAL(12,2) USING round("monto"::numeric,2),
  ALTER COLUMN "montoSena" TYPE DECIMAL(12,2) USING round("montoSena"::numeric,2),
  ADD COLUMN IF NOT EXISTS "validaHasta" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bocetoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "bocetoPublicId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Cotizacion_solicitudId_artistaId_key" ON "Cotizacion"("solicitudId","artistaId");

COMMIT;
