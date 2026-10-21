-- La aplicación consulta estas tablas desde el backend, no desde el navegador.
-- Conserva las políticas existentes y bloquea accesos directos sin una política válida.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Estudio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Solicitud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cotizacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FotoGaleria" ENABLE ROW LEVEL SECURITY;
COMMIT;
