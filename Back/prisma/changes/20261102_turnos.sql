BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL search_path=public,extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist;
DO $$ BEGIN
  CREATE TYPE "EstadoCita" AS ENUM ('PENDIENTE','CONFIRMADA','COMPLETADA','CANCELADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';
ALTER TABLE "Estudio" ADD COLUMN IF NOT EXISTS "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';
CREATE TABLE IF NOT EXISTS "Cita" (
  "id" TEXT PRIMARY KEY,
  "solicitudId" TEXT NOT NULL REFERENCES "Solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "artistaId" TEXT NOT NULL REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "cotizacionId" TEXT REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "creadaPorId" TEXT NOT NULL REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "titulo" TEXT NOT NULL,
  "inicioAt" TIMESTAMPTZ(3) NOT NULL,
  "finAt" TIMESTAMPTZ(3) NOT NULL,
  "importe" DECIMAL(12,2) NOT NULL,
  "sena" DECIMAL(12,2) NOT NULL,
  "estado" "EstadoCita" NOT NULL DEFAULT 'PENDIENTE',
  "notas" TEXT NOT NULL DEFAULT '',
  "recordatorios" JSONB NOT NULL DEFAULT '{}',
  "completadaAt" TIMESTAMPTZ(3),
  "canceladaAt" TIMESTAMPTZ(3),
  "claveCreacion" TEXT NOT NULL UNIQUE,
  "huellaCreacion" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cita_duracion_check" CHECK ("finAt">="inicioAt"+interval '30 minutes' AND "finAt"<="inicioAt"+interval '8 hours'),
  CONSTRAINT "Cita_importes_check" CHECK ("importe">=0 AND "importe"<=100000000 AND "sena">=0 AND "sena"<="importe"),
  CONSTRAINT "Cita_recordatorios_check" CHECK (jsonb_typeof("recordatorios")='object')
);
CREATE INDEX IF NOT EXISTS "Cita_artistaId_inicioAt_idx" ON "Cita"("artistaId","inicioAt");
CREATE INDEX IF NOT EXISTS "Cita_solicitudId_inicioAt_idx" ON "Cita"("solicitudId","inicioAt");
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='Cita_sin_cruces') THEN
    ALTER TABLE "Cita" ADD CONSTRAINT "Cita_sin_cruces" EXCLUDE USING gist (
      "artistaId" WITH =,tstzrange("inicioAt","finAt",'[)') WITH &&
    ) WHERE ("estado"<>'CANCELADA');
  END IF;
END $$;
ALTER TABLE "Cita" ENABLE ROW LEVEL SECURITY;
COMMIT;
