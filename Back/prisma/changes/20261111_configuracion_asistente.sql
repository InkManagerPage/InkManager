BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "ConfiguracionAsistente" (
  "id" TEXT PRIMARY KEY,
  "estudioId" TEXT UNIQUE REFERENCES "Estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "artistaId" TEXT UNIQUE REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "datos" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ConfiguracionAsistente_ambito" CHECK (num_nonnulls("estudioId", "artistaId") = 1)
);

ALTER TABLE "ConfiguracionAsistente" ENABLE ROW LEVEL SECURITY;
COMMIT;
