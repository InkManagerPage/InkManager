BEGIN;

SET LOCAL lock_timeout = '5s';

-- Las cuentas que usan Google pueden no tener una contraseña local.
ALTER TABLE "public"."Usuario"
  ALTER COLUMN "password" DROP NOT NULL;

-- Los usuarios existentes mantienen sus datos y quedan sin Google vinculado.
ALTER TABLE "public"."Usuario"
  ADD COLUMN IF NOT EXISTS "googleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_googleId_key"
  ON "public"."Usuario"("googleId");

COMMIT;
