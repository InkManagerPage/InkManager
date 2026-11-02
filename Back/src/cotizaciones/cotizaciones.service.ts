import { HttpError } from "../errors/http-error.js";
import { subirImagen } from "../imagenes/imagenes.service.js";
import { eliminarImagenSegura } from "../imagenes/imagenes.repository.js";
import {
  resolverAmbito,
  comprobarVersion,
} from "../solicitudes/solicitudes.service.js";
import { mutarSolicitud } from "../solicitudes/solicitudes.repository.js";
import {
  detalleSolicitud,
  estadoPanel,
  presentarSolicitud,
  type SolicitudCompleta,
} from "../solicitudes/solicitudes.entity.js";
import { validarIdConsulta } from "../solicitudes/solicitudes.validation.js";
import { validarCotizacion } from "./cotizaciones.validation.js";
import { guardarCotizacion } from "./cotizaciones.repository.js";
import type { Prisma } from "@prisma/client";

export async function guardarMiCotizacion(
  usuarioId: string,
  identificador: unknown,
  entrada: unknown,
  archivo?: Express.Multer.File,
) {
  const ambito = await resolverAmbito(usuarioId),
    id = validarIdConsulta(identificador),
    datos = validarCotizacion(entrada);
  if (!ambito.puedeProponer)
    throw new HttpError(
      403,
      "Solo los artistas activos pueden presentar propuestas.",
    );
  async function comprobar(tx: Prisma.TransactionClient, s: SolicitudCompleta) {
    comprobarVersion(s, datos.version);
    if (
      estadoPanel(s.estado) !== "ABIERTA" ||
      (s.cierrePropuestasAt && s.cierrePropuestasAt <= new Date())
    )
      throw new HttpError(409, "La recepción de propuestas está cerrada.");
    const activo = await tx.usuario.findFirst({
      where: {
        id: usuarioId,
        rol: "ARTISTA",
        estudioId: ambito.estudioId,
        ...(ambito.estudioId ? { estadoEnEstudio: "ACTIVO" } : {}),
      },
      select: { id: true },
    });
    if (!activo)
      throw new HttpError(
        403,
        "Ya no podés presentar propuestas en este espacio.",
      );
  }
  if (archivo)
    await mutarSolicitud(ambito, id, async (tx, s) => {
      await comprobar(tx, s);
    });
  const imagen = archivo ? await subirImagen(archivo) : undefined;
  let anterior: string | null = null;
  try {
    const resultado = await mutarSolicitud(ambito, id, async (tx, s) => {
      await comprobar(tx, s);
      anterior =
        s.cotizaciones.find((c) => c.artistaId === usuarioId)?.bocetoPublicId ||
        null;
      await guardarCotizacion(tx, id, usuarioId, datos, imagen);
      return tx.solicitud.update({
        where: { id },
        data: { version: { increment: 1 } },
        include: detalleSolicitud,
      });
    });
    if (imagen && anterior && anterior !== imagen.public_id)
      await eliminarImagenSegura(anterior);
    return presentarSolicitud(resultado, ambito);
  } catch (error) {
    if (imagen) await eliminarImagenSegura(imagen.public_id);
    throw error;
  }
}
