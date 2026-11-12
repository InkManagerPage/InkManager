import { prisma } from "../config/prisma.js";
import { ventanaRespuesta } from "../mensajes/mensajes.repository.js";
import { procesarMensajeBot, type EnviarBot } from "./instagram-bot.service.js";
import { activaInstagram } from "./instagram.conexion.js";
import { configuracionInstagram } from "./instagram.proveedor.js";

export async function procesarColaInstagram(enviar: EnviarBot, ahora = new Date()) {
  const disponible = {
    botResponderAt: { lte: ahora },
    OR: [{ botProcesandoHasta: null }, { botProcesandoHasta: { lte: ahora } }],
  };
  const hilos = await prisma.conversacionCanal.findMany({
    where: { canal: "INSTAGRAM", ...disponible },
    orderBy: { botResponderAt: "asc" },
    select: { id: true, cuentaId: true, estudioId: true, ultimaEntradaAt: true, botResponderAt: true,
      estudio: { select: { propietario: { select: { id: true, rol: true, suspendidoAt: true, estudioId: true } } } } },
    take: 5,
  });
  await Promise.all(hilos.map(async hilo => {
    const hasta = new Date(Date.now() + 90_000);
    const lote = { id: hilo.id, botResponderAt: hilo.botResponderAt };
    const tomado = await prisma.conversacionCanal.updateMany({
      where: { ...disponible, ...lote }, data: { botProcesandoHasta: hasta },
    });
    if (!tomado.count) return;
    const bloqueo = { id: hilo.id, botProcesandoHasta: hasta };
    const vigente = async () => Boolean(await prisma.conversacionCanal.findFirst({
      where: { ...lote, ...bloqueo }, select: { id: true },
    }));
    try {
      const [mensajes, conexion] = await Promise.all([
        prisma.mensajeCanal.findMany({
          where: { conversacionId: hilo.id, botPendiente: true },
          orderBy: [{ fecha: "asc" }, { id: "asc" }],
          select: { id: true, texto: true, accionBot: true },
        }),
        prisma.conexionCanal.findUnique({
          where: { canal_cuentaId: { canal: "INSTAGRAM", cuentaId: hilo.cuentaId } },
        }),
      ]);
      if (!(await vigente())) return;
      const titular = hilo.estudio?.propietario;
      if (mensajes.length && titular?.rol === "ESTUDIO_ADMIN" && !titular.suspendidoAt &&
          titular.estudioId === hilo.estudioId && conexion?.estudioId === hilo.estudioId &&
          activaInstagram(conexion) && Date.now() - hilo.ultimaEntradaAt.getTime() < ventanaRespuesta) {
        const ultimo = mensajes.at(-1)!;
        const accion = [...mensajes].reverse().find(m => m.accionBot)?.accionBot ?? undefined;
        const texto = [...new Set(mensajes.filter(m => !m.accionBot).map(m => m.texto))].join("\n").slice(-3000);
        const procesado = await procesarMensajeBot(hilo.id, titular.id, ultimo.id, texto, enviar, accion, vigente);
        if (procesado === false) return;
      }
      await prisma.$transaction([
        prisma.mensajeCanal.updateMany({
          where: { conversacionId: hilo.id, id: { in: mensajes.map(m => m.id) } },
          data: { botPendiente: false },
        }),
        prisma.conversacionCanal.updateMany({
          where: { ...lote, ...bloqueo }, data: { botResponderAt: null },
        }),
      ]);
    } catch {
      await prisma.conversacionCanal.updateMany({
        where: { ...lote, ...bloqueo }, data: { botResponderAt: new Date(Date.now() + 10_000) },
      });
      console.error("No pudimos procesar los mensajes pendientes de Instagram.");
    } finally {
      await prisma.conversacionCanal.updateMany({ where: bloqueo, data: { botProcesandoHasta: null } });
    }
  }));
}

export function iniciarColaInstagram(enviar: EnviarBot) {
  if (!configuracionInstagram()) return;
  let ejecutando = false;
  setInterval(async () => {
    if (ejecutando) return;
    ejecutando = true;
    try {
      await procesarColaInstagram(enviar);
    } catch {
      console.error("No pudimos revisar la cola de Instagram.");
    } finally {
      ejecutando = false;
    }
  }, 1_000).unref();
}
