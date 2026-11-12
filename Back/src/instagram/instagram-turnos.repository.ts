import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { ventanaRespuesta } from "../mensajes/mensajes.repository.js";
import { mensajeTurno } from "./instagram-agenda.js";
import type { EnviarBot } from "./instagram-bot.service.js";
import { activaInstagram } from "./instagram.conexion.js";

export async function notificarTurnosInstagram(enviar: EnviarBot) {
  const ahora = new Date();
  const recientes = new Date(ahora.getTime() - ventanaRespuesta);
  const citas = await prisma.cita.findMany({
    where: { avisoInstagramConversacionId: { not: null }, inicioAt: { gt: ahora },
      estado: { in: ["PENDIENTE", "CONFIRMADA"] }, createdAt: { gt: recientes } },
    orderBy: { createdAt: "asc" }, take: 20,
    select: { id: true, inicioAt: true, estado: true, artistaId: true, avisoInstagramConversacionId: true,
      solicitud: { select: { id: true, estudioId: true, artistaDestinoId: true } } },
  });
  for (const cita of citas) {
    const hiloId = cita.avisoInstagramConversacionId!;
    const s = cita.solicitud;
    const hilo = await prisma.conversacionCanal.findFirst({
      where: { id: hiloId, canal: "INSTAGRAM", solicitudId: s.id, estudioId: s.estudioId,
        artistaId: s.estudioId ? null : s.artistaDestinoId ?? cita.artistaId },
      include: { estudio: { select: { zonaHoraria: true } }, artista: { select: { zonaHoraria: true } },
        flujoInstagram: { select: { pausadoAt: true } } },
    });
    try {
      if (hilo && !hilo.flujoInstagram?.pausadoAt && hilo.ultimaEntradaAt > recientes) {
        const conexion = await prisma.conexionCanal.findUnique({
          where: { canal_cuentaId: { canal: "INSTAGRAM", cuentaId: hilo.cuentaId } },
        });
        if (activaInstagram(conexion) && conexion?.estudioId === hilo.estudioId && conexion.artistaId === hilo.artistaId) {
          const zona = hilo.estudio?.zonaHoraria ?? hilo.artista?.zonaHoraria ?? "America/Argentina/Buenos_Aires";
          const estado = await enviar(hilo, "bot:turno-manual:" + cita.id, mensajeTurno(cita, zona, true));
          if (estado === "ENVIANDO") continue;
        }
      }
      await prisma.cita.updateMany({
        where: { id: cita.id, avisoInstagramConversacionId: hiloId },
        data: { avisoInstagramConversacionId: null },
      });
    } catch (error) {
      if (!(error instanceof HttpError)) console.error("No pudimos avisar un turno por Instagram.");
    }
  }
}
