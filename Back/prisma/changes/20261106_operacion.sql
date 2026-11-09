BEGIN;
SET LOCAL lock_timeout = '5s';

-- CreateEnum
CREATE TYPE "EstadoMensajeWhatsApp" AS ENUM ('RECIBIDO', 'ENVIANDO', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'ERROR', 'INCIERTO');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "suspendidoAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Estudio" ADD COLUMN     "biografia" TEXT,
ADD COLUMN     "ciudadId" INTEGER,
ADD COLUMN     "emailContacto" TEXT,
ADD COLUMN     "telefono" TEXT;

-- AlterTable
ALTER TABLE "Contacto" ADD COLUMN     "recordatorios" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "ConversacionWhatsApp" (
    "id" TEXT NOT NULL,
    "numeroId" TEXT NOT NULL,
    "remitente" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estudioId" TEXT,
    "artistaId" TEXT,
    "solicitudId" TEXT,
    "ultimaEntradaAt" TIMESTAMPTZ(3) NOT NULL,
    "ultimaActividad" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ConversacionWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeWhatsApp" (
    "id" TEXT NOT NULL,
    "conversacionId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "claveEnvio" TEXT,
    "texto" TEXT NOT NULL,
    "propio" BOOLEAN NOT NULL,
    "estado" "EstadoMensajeWhatsApp" NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL,
    "leidoAt" TIMESTAMPTZ(3),

    CONSTRAINT "MensajeWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferenciasCorreo" (
    "usuarioId" TEXT NOT NULL,
    "reglas" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferenciasCorreo_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "EntregaRecordatorio" (
    "clave" TEXT NOT NULL,
    "reclamadaAt" TIMESTAMPTZ(3) NOT NULL,
    "enviadaAt" TIMESTAMPTZ(3),
    "intentos" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EntregaRecordatorio_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "AvisoPanel" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leidaAt" TIMESTAMPTZ(3),

    CONSTRAINT "AvisoPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccionAdministrativa" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccionAdministrativa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversacionWhatsApp_estudioId_ultimaActividad_idx" ON "ConversacionWhatsApp"("estudioId", "ultimaActividad");

-- CreateIndex
CREATE INDEX "ConversacionWhatsApp_artistaId_ultimaActividad_idx" ON "ConversacionWhatsApp"("artistaId", "ultimaActividad");

-- CreateIndex
CREATE INDEX "ConversacionWhatsApp_solicitudId_idx" ON "ConversacionWhatsApp"("solicitudId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversacionWhatsApp_numeroId_remitente_key" ON "ConversacionWhatsApp"("numeroId", "remitente");

-- CreateIndex
CREATE UNIQUE INDEX "MensajeWhatsApp_proveedorId_key" ON "MensajeWhatsApp"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "MensajeWhatsApp_claveEnvio_key" ON "MensajeWhatsApp"("claveEnvio");

-- CreateIndex
CREATE INDEX "MensajeWhatsApp_conversacionId_fecha_idx" ON "MensajeWhatsApp"("conversacionId", "fecha");

-- CreateIndex
CREATE INDEX "AvisoPanel_usuarioId_createdAt_idx" ON "AvisoPanel"("usuarioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AvisoPanel_usuarioId_clave_key" ON "AvisoPanel"("usuarioId", "clave");

-- CreateIndex
CREATE INDEX "AccionAdministrativa_createdAt_idx" ON "AccionAdministrativa"("createdAt");

-- AddForeignKey
ALTER TABLE "ConversacionWhatsApp" ADD CONSTRAINT "ConversacionWhatsApp_estudioId_fkey" FOREIGN KEY ("estudioId") REFERENCES "Estudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversacionWhatsApp" ADD CONSTRAINT "ConversacionWhatsApp_artistaId_fkey" FOREIGN KEY ("artistaId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversacionWhatsApp" ADD CONSTRAINT "ConversacionWhatsApp_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeWhatsApp" ADD CONSTRAINT "MensajeWhatsApp_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "ConversacionWhatsApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenciasCorreo" ADD CONSTRAINT "PreferenciasCorreo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoPanel" ADD CONSTRAINT "AvisoPanel_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccionAdministrativa" ADD CONSTRAINT "AccionAdministrativa_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccionAdministrativa" ADD CONSTRAINT "AccionAdministrativa_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversacionWhatsApp" ADD CONSTRAINT "ConversacionWhatsApp_un_negocio" CHECK (("estudioId" IS NULL) <> ("artistaId" IS NULL));

ALTER TABLE "ConversacionWhatsApp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MensajeWhatsApp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PreferenciasCorreo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EntregaRecordatorio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvisoPanel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccionAdministrativa" ENABLE ROW LEVEL SECURITY;

COMMIT;
