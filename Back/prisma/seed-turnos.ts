import "dotenv/config";
import { PrismaClient, type EstadoCita } from "@prisma/client";
import { DateTime } from "luxon";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();
const uid = (n: number) =>
  `af102026-1102-4000-8000-${String(n).padStart(12, "0")}`;
const hoy = DateTime.now()
  .setZone("America/Argentina/Buenos_Aires")
  .startOf("day");

async function ejecutar() {
  await prisma.$transaction(
    async (tx) => {
      if (
        (await tx.usuario.count({
          where: { id: { in: [uid(1), uid(2), uid(3), uid(4), uid(5)] } },
        })) !== 5
      )
        throw new Error(
          "Primero cargá las cuentas del recorrido con seed:recorrido.",
        );
      const proyectos = [
        {
          artista: 2,
          contacto: 1000,
          titulo: "Olivo y flores silvestres",
          independiente: false,
        },
        {
          artista: 3,
          contacto: 1001,
          titulo: "Composición geométrica",
          independiente: false,
        },
        {
          artista: 4,
          contacto: 1006,
          titulo: "Pieza ornamental",
          independiente: true,
        },
        {
          artista: 5,
          contacto: 1008,
          titulo: "Golondrina a color",
          independiente: true,
        },
      ];
      for (const [i, p] of proyectos.entries()) {
        const solicitudId = uid(4000 + i),
          artistaId = uid(p.artista),
          cotizacionId = uid(6000 + i);
        await tx.solicitud.upsert({
          where: { id: solicitudId },
          update: {},
          create: {
            id: solicitudId,
            contactoId: uid(p.contacto),
            ...(p.independiente
              ? { artistaDestinoId: artistaId }
              : { estudioId: uid(100) }),
            artistaAsignadoId: artistaId,
            titulo: p.titulo,
            estado: "ASIGNADA",
            estilo: i % 2 ? "Tradicional" : "Fine Line",
            tipoColor: "BLACK_AND_GREY",
            generoCuerpo: "FEMENINO",
            zonaGeneral: "BRAZO",
            subZona: "Antebrazo",
            tamano: "15 × 8 cm",
            descripcion: `Diseño personalizado de ${p.titulo.toLowerCase()} en varias sesiones.`,
            referencias: [],
            canal: "WEB",
            cerradaAt: hoy.minus({ days: 12 }).toJSDate(),
            asignadaPor: p.independiente ? "ARTISTA" : "ESTUDIO",
          },
        });
        await tx.cotizacion.upsert({
          where: { solicitudId_artistaId: { solicitudId, artistaId } },
          update: {},
          create: {
            id: cotizacionId,
            solicitudId,
            artistaId,
            monto: 240000,
            montoSena: 40000,
            mensaje:
              "Diseño personalizado y dos sesiones. Incluye revisión del boceto.",
          },
        });
        const sesiones: {
          dia: number;
          hora: number;
          estado: EstadoCita;
          importe: number;
        }[] = [
          { dia: -2, hora: 11, estado: "COMPLETADA", importe: 120000 },
          { dia: 0, hora: 16, estado: "CONFIRMADA", importe: 120000 },
          { dia: 2, hora: 12, estado: "PENDIENTE", importe: 60000 },
          { dia: -1, hora: 10, estado: "CONFIRMADA", importe: 45000 },
          { dia: 4, hora: 14, estado: "CANCELADA", importe: 0 },
        ];
        for (const [j, sesion] of sesiones.entries()) {
          const id = uid(5000 + i * 10 + j);
          const inicioAt = hoy
            .plus({ days: sesion.dia, hours: sesion.hora })
            .toJSDate();
          const finAt = new Date(inicioAt.getTime() + 90 * 60000);
          await tx.cita.upsert({
            where: { id },
            update: {},
            create: {
              id,
              solicitudId,
              artistaId,
              cotizacionId,
              creadaPorId: p.independiente ? artistaId : uid(1),
              titulo: `${p.titulo} · sesión ${j + 1}`,
              inicioAt,
              finAt,
              importe: sesion.importe,
              sena: Math.min(20000, sesion.importe),
              estado: sesion.estado,
              notas: "",
              recordatorios: {},
              claveCreacion: id,
              huellaCreacion: createHash("sha256").update(id).digest("hex"),
              completadaAt: sesion.estado === "COMPLETADA" ? finAt : null,
              canceladaAt:
                sesion.estado === "CANCELADA" ? hoy.toJSDate() : null,
            },
          });
        }
      }
    },
    { timeout: 120000, maxWait: 15000 },
  );
  console.log(
    "Verificados 4 proyectos asignados y 20 turnos para las cuentas del recorrido.",
  );
}
ejecutar()
  .catch((error) => {
    console.error(
      "No se pudo completar la carga de turnos.",
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[conexión]")
        : "Error desconocido",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
