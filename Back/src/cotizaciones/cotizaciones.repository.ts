import type { Prisma } from "@prisma/client";
import type { DatosCotizacion } from "./cotizaciones.entity.js";
export function guardarCotizacion(
  tx: Prisma.TransactionClient,
  solicitudId: string,
  artistaId: string,
  datos: DatosCotizacion,
  imagen?: { url: string; public_id: string },
) {
  const data = {
    monto: datos.importe,
    montoSena: datos.sena,
    mensaje: datos.detalle,
    validaHasta: datos.validez,
    ...(datos.duracionMinutos !== undefined && { duracionMinutos: datos.duracionMinutos }),
    ...(imagen
      ? { bocetoUrl: imagen.url, bocetoPublicId: imagen.public_id }
      : {}),
  };
  return tx.cotizacion.upsert({
    where: { solicitudId_artistaId: { solicitudId, artistaId } },
    create: { solicitudId, artistaId, ...data },
    update: data,
  });
}
