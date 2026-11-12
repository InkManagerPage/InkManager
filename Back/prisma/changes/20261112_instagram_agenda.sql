BEGIN;

ALTER TABLE "Cita" ADD COLUMN IF NOT EXISTS "avisoInstagramConversacionId" text;
CREATE INDEX IF NOT EXISTS "Cita_avisoInstagram_pendiente_idx" ON "Cita" ("createdAt")
  WHERE "avisoInstagramConversacionId" IS NOT NULL;
ALTER TABLE "MensajeCanal" ADD COLUMN IF NOT EXISTS "ecoInstagram" boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION pg_temp.id_mensaje_instagram(id text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  variante text;
  decodificado text;
BEGIN
  IF id ~ '^ig_dm_item:[0-9]+:IGMessageID(:[0-9]+){3}$' THEN
    RETURN id;
  END IF;
  FOREACH variante IN ARRAY ARRAY[id, replace(replace(replace(replace(id,
      'ZB', '+'), 'ZC', '/'), 'ZD', '='), 'ZA', 'Z')] LOOP
    BEGIN
      variante := translate(variante, '-_', '+/');
      decodificado := convert_from(decode(
        variante || repeat('=', (4 - length(variante) % 4) % 4), 'base64'), 'UTF8');
      IF decodificado ~ '^(new_)?ig_dm_item:[0-9]+:IGMessageID(:[0-9]+){3}$' THEN
        RETURN regexp_replace(decodificado, '^new_', '');
      END IF;
    EXCEPTION WHEN invalid_parameter_value OR character_not_in_repertoire OR untranslatable_character THEN
      CONTINUE;
    END;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE TEMP TABLE ids_instagram ON COMMIT DROP AS
SELECT m.id, m."conversacionId", m."claveEnvio", m."fecha",
  pg_temp.id_mensaje_instagram(m."proveedorId") AS canonico
FROM "MensajeCanal" m
JOIN "ConversacionCanal" c ON c.id = m."conversacionId"
WHERE c.canal = 'INSTAGRAM' AND m."propio" AND (
  m."proveedorId" LIKE 'bmV3X2ln%' OR m."proveedorId" LIKE 'aWdf%' OR m."proveedorId" LIKE 'ig_dm_item:%'
);

WITH duplicados AS (
  SELECT id, "claveEnvio", row_number() OVER (
    PARTITION BY "conversacionId", canonico
    ORDER BY ("claveEnvio" IS NOT NULL) DESC, "fecha", id
  ) AS copia
  FROM ids_instagram
  WHERE canonico IS NOT NULL
)
UPDATE "MensajeCanal" m
SET "ecoInstagram" = true
FROM duplicados d
WHERE m.id = d.id AND d."claveEnvio" IS NULL AND d.copia > 1 AND NOT m."ecoInstagram";

COMMIT;
