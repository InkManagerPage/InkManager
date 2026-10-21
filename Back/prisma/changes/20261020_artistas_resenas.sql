-- Cambio aditivo: conserva todos los usuarios, solicitudes y cotizaciones existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "fotoPerfil" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "fotoPublicId" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "resena" TEXT;
COMMIT;
