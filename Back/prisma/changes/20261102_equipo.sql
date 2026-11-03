BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
  CREATE TYPE "EstadoInvitacionEquipo" AS ENUM ('PENDIENTE','ACEPTADA','RECHAZADA','CANCELADA','VENCIDA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "EstadoEnvioInvitacion" AS ENUM ('PENDIENTE','ENVIADA','ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "versionEquipo" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS "InvitacionEquipo" (
  "id" TEXT PRIMARY KEY,
  "estudioId" TEXT NOT NULL REFERENCES "Estudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "creadaPorId" TEXT NOT NULL REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "email" TEXT NOT NULL,
  "estado" "EstadoInvitacionEquipo" NOT NULL DEFAULT 'PENDIENTE',
  "expiraAt" TIMESTAMPTZ(3) NOT NULL,
  "aceptadaPorId" TEXT REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "respondidaAt" TIMESTAMPTZ(3),
  "estadoEnvio" "EstadoEnvioInvitacion" NOT NULL DEFAULT 'PENDIENTE',
  "ultimoIntentoAt" TIMESTAMPTZ(3) NOT NULL,
  "enviadaAt" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvitacionEquipo_email_check" CHECK ("email"=lower(trim("email")) AND length("email") BETWEEN 3 AND 254),
  CONSTRAINT "InvitacionEquipo_aceptacion_check" CHECK (("estado"='ACEPTADA')=("aceptadaPorId" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS "InvitacionEquipo_estudioId_createdAt_idx" ON "InvitacionEquipo"("estudioId","createdAt");
CREATE INDEX IF NOT EXISTS "InvitacionEquipo_email_estado_expiraAt_idx" ON "InvitacionEquipo"("email","estado","expiraAt");
CREATE UNIQUE INDEX IF NOT EXISTS "InvitacionEquipo_pendiente_unica" ON "InvitacionEquipo"("estudioId","email") WHERE "estado"='PENDIENTE';
ALTER TABLE "InvitacionEquipo" ENABLE ROW LEVEL SECURITY;
COMMIT;
