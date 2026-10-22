BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE TABLE "public"."Sesion" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "expiraAt" TIMESTAMP(3) NOT NULL,
  "revocadaAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "Sesion_usuarioId_fkey"
    FOREIGN KEY ("usuarioId")
    REFERENCES "public"."Usuario"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "Sesion_usuarioId_idx"
  ON "public"."Sesion"("usuarioId");

CREATE INDEX "Sesion_expiraAt_idx"
  ON "public"."Sesion"("expiraAt");

ALTER TABLE "public"."Sesion" ENABLE ROW LEVEL SECURITY;

COMMIT;