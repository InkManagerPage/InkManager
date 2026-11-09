BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "ConexionWhatsApp" (
    "estudioId" TEXT NOT NULL PRIMARY KEY REFERENCES "Estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "numeroId" TEXT NOT NULL UNIQUE,
    "wabaId" TEXT NOT NULL UNIQUE,
    "telefono" TEXT NOT NULL,
    "tokenCifrado" TEXT,
    "expiraAt" TIMESTAMPTZ(3),
    "activadaAt" TIMESTAMPTZ(3),
    "bloqueoHasta" TIMESTAMPTZ(3),
    "requierePin" BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE "ConexionWhatsApp" ENABLE ROW LEVEL SECURITY;

COMMIT;
