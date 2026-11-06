BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE TYPE "PlanSuscripcion" AS ENUM ('INDIVIDUAL', 'ESTUDIO');
CREATE TYPE "CicloSuscripcion" AS ENUM ('MENSUAL', 'ANUAL');
CREATE TYPE "EstadoSuscripcion" AS ENUM (
  'PENDIENTE',
  'ACTIVA',
  'VENCIDA',
  'CANCELADA',
  'ERROR'
);
CREATE TYPE "EstadoPagoSuscripcion" AS ENUM (
  'PENDIENTE',
  'APROBADO',
  'RECHAZADO'
);

CREATE TABLE "Suscripcion" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "plan" "PlanSuscripcion" NOT NULL,
  "ciclo" "CicloSuscripcion" NOT NULL,
  "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'PENDIENTE',
  "monto" DECIMAL(12,2) NOT NULL,
  "moneda" TEXT NOT NULL DEFAULT 'ARS',
  "mercadoPagoId" TEXT,
  "referenciaExterna" TEXT NOT NULL,
  "proximoCobroAt" TIMESTAMP(3),
  "periodoHasta" TIMESTAMP(3),
  "canceladaAt" TIMESTAMP(3),
  "correoCancelacionEnviadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Suscripcion_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Suscripcion_mercadoPagoId_key"
  ON "Suscripcion"("mercadoPagoId");
CREATE UNIQUE INDEX "Suscripcion_referenciaExterna_key"
  ON "Suscripcion"("referenciaExterna");
CREATE INDEX "Suscripcion_usuarioId_estado_createdAt_idx"
  ON "Suscripcion"("usuarioId", "estado", "createdAt");
CREATE INDEX "Suscripcion_estado_proximoCobroAt_idx"
  ON "Suscripcion"("estado", "proximoCobroAt");
CREATE UNIQUE INDEX "Suscripcion_usuarioId_activa_pendiente_key"
  ON "Suscripcion"("usuarioId")
  WHERE "estado" IN ('PENDIENTE', 'ACTIVA');

CREATE TABLE "PagoSuscripcion" (
  "id" TEXT NOT NULL,
  "suscripcionId" TEXT NOT NULL,
  "mercadoPagoId" TEXT NOT NULL,
  "estado" "EstadoPagoSuscripcion" NOT NULL,
  "monto" DECIMAL(12,2),
  "moneda" TEXT,
  "aprobadoAt" TIMESTAMP(3),
  "correoEnviadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PagoSuscripcion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PagoSuscripcion_suscripcionId_fkey"
    FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PagoSuscripcion_mercadoPagoId_key"
  ON "PagoSuscripcion"("mercadoPagoId");
CREATE INDEX "PagoSuscripcion_suscripcionId_createdAt_idx"
  ON "PagoSuscripcion"("suscripcionId", "createdAt");

CREATE TABLE "TokenCancelacion" (
  "id" TEXT NOT NULL,
  "suscripcionId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiraAt" TIMESTAMP(3) NOT NULL,
  "usadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TokenCancelacion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TokenCancelacion_suscripcionId_fkey"
    FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TokenCancelacion_tokenHash_key"
  ON "TokenCancelacion"("tokenHash");
CREATE INDEX "TokenCancelacion_suscripcionId_expiraAt_idx"
  ON "TokenCancelacion"("suscripcionId", "expiraAt");

CREATE TABLE "AvisoVencimiento" (
  "id" TEXT NOT NULL,
  "suscripcionId" TEXT NOT NULL,
  "proximoCobroAt" TIMESTAMP(3) NOT NULL,
  "enviadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvisoVencimiento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AvisoVencimiento_suscripcionId_fkey"
    FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AvisoVencimiento_suscripcionId_proximoCobroAt_key"
  ON "AvisoVencimiento"("suscripcionId", "proximoCobroAt");

ALTER TABLE "Suscripcion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PagoSuscripcion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TokenCancelacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvisoVencimiento" ENABLE ROW LEVEL SECURITY;

COMMIT;
