BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE UNIQUE INDEX IF NOT EXISTS "Contacto_id_estudioId_key" ON "Contacto"("id","estudioId");
CREATE UNIQUE INDEX IF NOT EXISTS "Contacto_id_artistaId_key" ON "Contacto"("id","artistaId");
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='Solicitud_contacto_estudio_fkey') THEN
    ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_contacto_estudio_fkey"
      FOREIGN KEY ("contactoId","estudioId") REFERENCES "Contacto"("id","estudioId") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='Solicitud_contacto_artista_fkey') THEN
    ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_contacto_artista_fkey"
      FOREIGN KEY ("contactoId","artistaDestinoId") REFERENCES "Contacto"("id","artistaId") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='Solicitud_ambito_check') THEN
    ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_ambito_check" CHECK (num_nonnulls("estudioId","artistaDestinoId")=1);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='Solicitud_cliente_check') THEN
    ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_cliente_check" CHECK (num_nonnulls("clienteId","contactoId")>=1);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='Cotizacion_importes_check') THEN
    ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_importes_check" CHECK ("monto">0 AND "montoSena">=0 AND "montoSena"<="monto");
  END IF;
END $$;
COMMIT;
