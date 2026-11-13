BEGIN;

ALTER TABLE "Cotizacion"
  ADD COLUMN "duracionMinutos" integer,
  ADD CONSTRAINT "Cotizacion_duracion_check" CHECK ("duracionMinutos" BETWEEN 30 AND 480);

ALTER TABLE "ConversacionCanal"
  ADD COLUMN "botResponderAt" timestamptz(3),
  ADD COLUMN "botProcesandoHasta" timestamptz(3);
CREATE INDEX "ConversacionCanal_botResponderAt_idx"
  ON "ConversacionCanal" ("botResponderAt") WHERE "botResponderAt" IS NOT NULL;

ALTER TABLE "MensajeCanal"
  ADD COLUMN "botPendiente" boolean NOT NULL DEFAULT false,
  ADD COLUMN "accionBot" text;
CREATE INDEX "MensajeCanal_botPendiente_idx"
  ON "MensajeCanal" ("conversacionId", "fecha") WHERE "botPendiente";

ALTER TABLE "AvisoPanel" ADD COLUMN "urgente" boolean NOT NULL DEFAULT false;

COMMIT;
