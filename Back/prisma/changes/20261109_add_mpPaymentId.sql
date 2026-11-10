-- Add mpPaymentId column to Suscripcion table
ALTER TABLE "Suscripcion" ADD COLUMN "mpPaymentId" TEXT UNIQUE;

-- Create index for performance
CREATE INDEX "idx_Suscripcion_mpPaymentId" ON "Suscripcion"("mpPaymentId");
