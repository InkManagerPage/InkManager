BEGIN;

ALTER TABLE "Suscripcion"
  ADD COLUMN IF NOT EXISTS "bonificada" boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = '"Suscripcion"'::regclass AND conname = 'Suscripcion_bonificada_sin_cobro_check') THEN
    ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_bonificada_sin_cobro_check"
      CHECK (NOT "bonificada" OR (
        "monto" = 0 AND "mercadoPagoId" IS NULL AND "mpPaymentId" IS NULL
        AND "proximoCobroAt" IS NULL
      ));
  END IF;
END $$;

COMMIT;
