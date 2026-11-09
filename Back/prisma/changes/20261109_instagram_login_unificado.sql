BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "ConexionCanal"
    ADD COLUMN "loginUnificado" BOOLEAN NOT NULL DEFAULT false,
    ALTER COLUMN "expiraAt" DROP NOT NULL;

COMMIT;
