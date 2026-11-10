SET lock_timeout = '5s';

DO $$ BEGIN
  CREATE TYPE "PlanSuscripcion" AS ENUM ('INDIVIDUAL', 'ESTUDIO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CicloSuscripcion" AS ENUM ('MENSUAL', 'ANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoSuscripcion" AS ENUM (
    'PENDIENTE', 'ACTIVA', 'VENCIDA', 'CANCELADA', 'PAUSADA', 'RECHAZADA', 'ERROR'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "EstadoSuscripcion" ADD VALUE IF NOT EXISTS 'VENCIDA';
ALTER TYPE "EstadoSuscripcion" ADD VALUE IF NOT EXISTS 'PAUSADA';
ALTER TYPE "EstadoSuscripcion" ADD VALUE IF NOT EXISTS 'RECHAZADA';

DO $$ BEGIN
  CREATE TYPE "EstadoPagoSuscripcion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Suscripcion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "usuarioId" TEXT NOT NULL REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "plan" "PlanSuscripcion" NOT NULL,
  "ciclo" "CicloSuscripcion" NOT NULL DEFAULT 'MENSUAL',
  "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'PENDIENTE',
  "monto" DECIMAL(12,2) NOT NULL,
  "moneda" TEXT NOT NULL DEFAULT 'ARS',
  "mercadoPagoId" TEXT,
  "mpPaymentId" TEXT,
  "referenciaExterna" TEXT NOT NULL,
  "proximoCobroAt" TIMESTAMPTZ(3),
  "periodoHasta" TIMESTAMPTZ(3),
  "canceladaAt" TIMESTAMPTZ(3),
  "correoCancelacionEnviadoAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Suscripcion"
  ADD COLUMN IF NOT EXISTS "ciclo" "CicloSuscripcion" NOT NULL DEFAULT 'MENSUAL',
  ADD COLUMN IF NOT EXISTS "monto" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "moneda" TEXT NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS "mercadoPagoId" TEXT,
  ADD COLUMN IF NOT EXISTS "mpPaymentId" TEXT,
  ADD COLUMN IF NOT EXISTS "referenciaExterna" TEXT,
  ADD COLUMN IF NOT EXISTS "proximoCobroAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "periodoHasta" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "canceladaAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "correoCancelacionEnviadoAt" TIMESTAMPTZ(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Suscripcion' AND column_name = 'importe'
  ) THEN
    EXECUTE 'UPDATE "Suscripcion" SET "monto" = COALESCE("monto", "importe")';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Suscripcion' AND column_name = 'mpPreapprovalId'
  ) THEN
    EXECUTE 'UPDATE "Suscripcion" SET "mercadoPagoId" = COALESCE("mercadoPagoId", "mpPreapprovalId")';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Suscripcion' AND column_name = 'proximoPagoAt'
  ) THEN
    EXECUTE 'UPDATE "Suscripcion" SET "proximoCobroAt" = COALESCE("proximoCobroAt", "proximoPagoAt")';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Suscripcion' AND column_name = 'periodoFinAt'
  ) THEN
    EXECUTE 'UPDATE "Suscripcion" SET "periodoHasta" = COALESCE("periodoHasta", "periodoFinAt")';
  END IF;
  UPDATE "Suscripcion"
  SET "referenciaExterna" = 'legacy-' || "id"
  WHERE "referenciaExterna" IS NULL;
  IF EXISTS (SELECT 1 FROM "Suscripcion" WHERE "monto" IS NULL) THEN
    RAISE EXCEPTION 'No se pudo completar el monto de todas las suscripciones existentes.';
  END IF;
END $$;

ALTER TABLE "Suscripcion"
  DROP COLUMN IF EXISTS "importe",
  DROP COLUMN IF EXISTS "mpPreapprovalId",
  DROP COLUMN IF EXISTS "proximoPagoAt",
  DROP COLUMN IF EXISTS "periodoFinAt";

ALTER TABLE "Suscripcion" ALTER COLUMN "monto" SET NOT NULL;
ALTER TABLE "Suscripcion" ALTER COLUMN "referenciaExterna" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Suscripcion_mercadoPagoId_key"
  ON "Suscripcion"("mercadoPagoId");
CREATE UNIQUE INDEX IF NOT EXISTS "Suscripcion_mpPaymentId_key"
  ON "Suscripcion"("mpPaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Suscripcion_referenciaExterna_key"
  ON "Suscripcion"("referenciaExterna");
CREATE INDEX IF NOT EXISTS "Suscripcion_usuarioId_estado_createdAt_idx"
  ON "Suscripcion"("usuarioId", "estado", "createdAt");
CREATE INDEX IF NOT EXISTS "Suscripcion_estado_proximoCobroAt_idx"
  ON "Suscripcion"("estado", "proximoCobroAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Suscripcion_usuarioId_activa_pendiente_key"
  ON "Suscripcion"("usuarioId")
  WHERE "estado" IN ('PENDIENTE', 'ACTIVA');

CREATE TABLE IF NOT EXISTS "PagoSuscripcion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "suscripcionId" TEXT NOT NULL REFERENCES "Suscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "mercadoPagoId" TEXT NOT NULL UNIQUE,
  "estado" "EstadoPagoSuscripcion" NOT NULL,
  "monto" DECIMAL(12,2),
  "moneda" TEXT,
  "aprobadoAt" TIMESTAMP(3),
  "correoEnviadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "PagoSuscripcion_suscripcionId_createdAt_idx"
  ON "PagoSuscripcion"("suscripcionId", "createdAt");

CREATE TABLE IF NOT EXISTS "TokenCancelacion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "suscripcionId" TEXT NOT NULL REFERENCES "Suscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiraAt" TIMESTAMP(3) NOT NULL,
  "usadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TokenCancelacion_suscripcionId_expiraAt_idx"
  ON "TokenCancelacion"("suscripcionId", "expiraAt");

CREATE TABLE IF NOT EXISTS "AvisoVencimiento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "suscripcionId" TEXT NOT NULL REFERENCES "Suscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "proximoCobroAt" TIMESTAMP(3) NOT NULL,
  "enviadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvisoVencimiento_suscripcionId_proximoCobroAt_key"
    UNIQUE ("suscripcionId", "proximoCobroAt")
);

ALTER TABLE "Suscripcion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PagoSuscripcion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TokenCancelacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvisoVencimiento" ENABLE ROW LEVEL SECURITY;
