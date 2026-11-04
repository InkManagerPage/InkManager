BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL search_path=public,extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE IF NOT EXISTS "DisponibilidadArtista" (
  "id" TEXT PRIMARY KEY,
  "artistaId" TEXT NOT NULL REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "estudioId" TEXT REFERENCES "Estudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "ambito" TEXT NOT NULL DEFAULT 'INDEPENDIENTE',
  "semana" JSONB,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Disponibilidad_ambito_check" CHECK ("ambito"=COALESCE("estudioId",'INDEPENDIENTE')),
  CONSTRAINT "Disponibilidad_semana_check" CHECK ("semana" IS NULL OR jsonb_typeof("semana")='array'),
  CONSTRAINT "Disponibilidad_version_check" CHECK ("version">=0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "DisponibilidadArtista_artistaId_ambito_key" ON "DisponibilidadArtista"("artistaId","ambito");
CREATE INDEX IF NOT EXISTS "DisponibilidadArtista_estudioId_idx" ON "DisponibilidadArtista"("estudioId");
CREATE TABLE IF NOT EXISTS "BloqueoAgenda" (
  "id" TEXT PRIMARY KEY,
  "disponibilidadId" TEXT NOT NULL REFERENCES "DisponibilidadArtista"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "creadaPorId" TEXT NOT NULL REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "motivo" TEXT NOT NULL CHECK (length(trim("motivo")) BETWEEN 1 AND 120),
  "inicioAt" TIMESTAMPTZ(3) NOT NULL,
  "finAt" TIMESTAMPTZ(3) NOT NULL,
  "diaCompleto" BOOLEAN NOT NULL DEFAULT false,
  "canceladoAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BloqueoAgenda_duracion_check" CHECK ("finAt">"inicioAt")
);
CREATE INDEX IF NOT EXISTS "BloqueoAgenda_disponibilidadId_inicioAt_idx" ON "BloqueoAgenda"("disponibilidadId","inicioAt");
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='BloqueoAgenda_sin_cruces') THEN
    ALTER TABLE "BloqueoAgenda" ADD CONSTRAINT "BloqueoAgenda_sin_cruces" EXCLUDE USING gist (
      "disponibilidadId" WITH =,tstzrange("inicioAt","finAt",'[)') WITH &&
    ) WHERE ("canceladoAt" IS NULL);
  END IF;
END $$;
ALTER TABLE "DisponibilidadArtista" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BloqueoAgenda" ENABLE ROW LEVEL SECURITY;
COMMIT;
