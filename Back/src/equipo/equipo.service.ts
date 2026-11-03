import { HttpError } from "../errors/http-error.js";
import { validarIdConsulta } from "../solicitudes/solicitudes.validation.js";
import { conTitular, contarPendientes } from "./equipo.repository.js";
import {
  validarCambioEquipo,
  validarDesvinculacion,
} from "./equipo.validation.js";
import { cuentaEquipo } from "./equipo.entity.js";

export async function cambiarIntegrante(
  usuarioId: string,
  identificador: unknown,
  entrada: unknown,
) {
  const id = validarIdConsulta(identificador),
    { accion, version } = validarCambioEquipo(entrada);
  return conTitular(usuarioId, async (tx, estudio) => {
    await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id"=${id} FOR UPDATE`;
    const artista = await tx.usuario.findFirst({
      where: { id, rol: "ARTISTA", estudioId: estudio.id },
      select: cuentaEquipo,
    });
    if (!artista)
      throw new HttpError(404, "Ese artista no pertenece a tu estudio.");
    if (artista.versionEquipo !== version)
      throw new HttpError(
        409,
        "El integrante cambió. Actualizá el equipo antes de continuar.",
      );
    if (accion === "DESVINCULAR")
      validarDesvinculacion(await contarPendientes(tx, id, estudio.id));
    const estado = accion === "SUSPENDER" ? "SUSPENDIDO" : "ACTIVO";
    if (accion !== "DESVINCULAR" && artista.estadoEnEstudio === estado)
      throw new HttpError(
        409,
        "El integrante ya tiene ese estado. Actualizá el equipo.",
      );
    await tx.usuario.update({
      where: { id },
      data: {
        estadoEnEstudio: estado,
        versionEquipo: { increment: 1 },
        ...(accion === "DESVINCULAR"
          ? { estudioId: null, zonaHoraria: estudio.zonaHoraria }
          : {}),
      },
    });
    return {
      message:
        accion === "DESVINCULAR"
          ? "Artista desvinculado."
          : accion === "SUSPENDER"
            ? "Artista suspendido."
            : "Artista habilitado.",
    };
  });
}
