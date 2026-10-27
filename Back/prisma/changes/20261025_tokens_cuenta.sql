-- Enlaces de correo: solo persistimos su hash y su vencimiento.
DO $$ BEGIN
  CREATE TYPE "TipoTokenCuenta" AS ENUM ('PASSWORD', 'VERIFICAR_EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TokenCuenta" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "tipo" "TipoTokenCuenta" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiraAt" TIMESTAMP(3) NOT NULL,
  "usadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TokenCuenta_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TokenCuenta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TokenCuenta_tokenHash_key" ON "TokenCuenta"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "TokenCuenta_usuarioId_tipo_key" ON "TokenCuenta"("usuarioId", "tipo");
CREATE INDEX IF NOT EXISTS "TokenCuenta_expiraAt_idx" ON "TokenCuenta"("expiraAt");
ALTER TABLE "TokenCuenta" ENABLE ROW LEVEL SECURITY;
