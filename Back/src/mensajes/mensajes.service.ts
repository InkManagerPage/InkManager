import { prisma } from "../config/prisma.js";
import {
  activaInstagram,
  ambitoInstagram,
  canalInstagram,
} from "../instagram/instagram.conexion.js";
import { configuracionInstagram } from "../instagram/instagram.proveedor.js";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";
import { configEnvio } from "../whatsapp/whatsapp.conexion.js";
import {
  configuracionMeta,
  configuracionWhatsApp,
} from "../whatsapp/whatsapp.proveedor.js";
import { listarConversaciones } from "../whatsapp/whatsapp.repository.js";
import { listarCanales } from "./mensajes.repository.js";

export async function resumenMensajes(
  a: AmbitoConsultas,
  cantidadMensajes = 1,
) {
  if (!a.administra && !a.puedeProponer) return { canales: [], whatsapp: [] };
  const [canales, whatsapp] = await Promise.all([
    listarCanales(a, cantidadMensajes),
    listarConversaciones(a, cantidadMensajes),
  ]);
  return { canales, whatsapp };
}

export async function bandejaMensajes(a: AmbitoConsultas) {
  const metaWhatsApp = configuracionMeta();
  const piloto = configuracionWhatsApp();
  const tieneWhatsApp = Boolean(metaWhatsApp || piloto);
  const [hilos, instagram, whatsapp] = await Promise.all([
    resumenMensajes(a, 60),
    configuracionInstagram() && (a.administra || a.puedeProponer)
      ? prisma.conexionCanal.findFirst({
          where: { canal: canalInstagram, ...ambitoInstagram(a) },
        })
      : null,
    tieneWhatsApp && (a.administra || a.puedeProponer)
      ? configEnvio(a.estudioId, a.estudioId ? null : a.usuarioId).catch(
          () => null,
        )
      : null,
  ]);
  const igActivo = activaInstagram(instagram);
  const conversaciones = [
    ...hilos.canales.map(({ cuentaId, ...hilo }) => ({
      ...hilo,
      puedeResponder:
        hilo.canal === canalInstagram &&
        igActivo &&
        instagram?.cuentaId === cuentaId,
    })),
    ...hilos.whatsapp.map(({ numeroId, ...hilo }) => ({
      ...hilo,
      puedeResponder: whatsapp?.numeroId === numeroId,
    })),
  ].sort(
    (a, b) =>
      (b.mensajes.at(-1)?.fecha.getTime() ?? 0) -
      (a.mensajes.at(-1)?.fecha.getTime() ?? 0),
  );
  return {
    conectado: igActivo || Boolean(whatsapp),
    administra: a.administra,
    mostrarWhatsApp:
      a.administra && Boolean((a.estudioId && metaWhatsApp) || whatsapp),
    conversaciones,
  };
}
