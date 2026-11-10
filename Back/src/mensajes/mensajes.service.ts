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
import { historialWhatsApp, listarConversaciones } from "../whatsapp/whatsapp.repository.js";
import { historialInstagram, listarCanales } from "./mensajes.repository.js";
import { tienePlanIndividual } from "../pagos/acceso-plan.js";
import { tamanoPaginaMensajes } from "./historial-mensajes.js";
import { HttpError } from "../errors/http-error.js";

export async function puedeUsarMensajes(a: AmbitoConsultas) {
  return a.estudioId ? a.administra || a.puedeProponer : tienePlanIndividual(a.usuarioId);
}

async function cargarHilos(a: AmbitoConsultas, cantidadMensajes: number, solicitudId?: string) {
  const [canales, whatsapp] = await Promise.all([
    listarCanales(a, cantidadMensajes, solicitudId),
    listarConversaciones(a, cantidadMensajes, solicitudId),
  ]);
  return { canales, whatsapp };
}

export async function resumenMensajes(
  a: AmbitoConsultas,
  cantidadMensajes = 1,
) {
  return await puedeUsarMensajes(a) ? cargarHilos(a, cantidadMensajes) : { canales: [], whatsapp: [] };
}

export async function historialMensajes(
  a: AmbitoConsultas, canal: "instagram" | "whatsapp", id: string, antes: string,
) {
  if (!(await puedeUsarMensajes(a)))
    throw new HttpError(403, "No podés acceder al historial de mensajes.");
  return canal === "instagram" ? historialInstagram(a, id, antes) : historialWhatsApp(a, id, antes);
}

export async function bandejaMensajes(a: AmbitoConsultas, solicitudId?: string) {
  if (!(await puedeUsarMensajes(a))) {
    return {
      conectado: false,
      administra: false,
      mostrarWhatsApp: false,
      requierePlanIndividual: !a.estudioId,
      conversaciones: [],
    };
  }
  const metaWhatsApp = configuracionMeta();
  const piloto = configuracionWhatsApp();
  const tieneWhatsApp = Boolean(metaWhatsApp || piloto);
  const [hilos, instagram, whatsapp] = await Promise.all([
    cargarHilos(a, tamanoPaginaMensajes, solicitudId),
    configuracionInstagram()
      ? prisma.conexionCanal.findFirst({
          where: { canal: canalInstagram, ...ambitoInstagram(a) },
        })
      : null,
    tieneWhatsApp
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
