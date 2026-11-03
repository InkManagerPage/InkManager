import { HttpError } from "../errors/http-error.js";
import { origenesPermitidos } from "../config/auth.js";
import { enviarCorreo } from "../correos/correos.service.js";
import { correoCuenta } from "../correos/correos.templates.js";
import { registrarErrorCorreo } from "../correos/correos.errors.js";
import {
  conTitular,
  conArtista,
  contarPendientes,
} from "../equipo/equipo.repository.js";
import { validarIngreso } from "../equipo/equipo.validation.js";
import { validarIdConsulta } from "../solicitudes/solicitudes.validation.js";
import {
  detalleInvitacion,
  presentarInvitacion,
  type InvitacionCompleta,
} from "./invitaciones-equipo.entity.js";
import { guardarResultadoEnvio } from "./invitaciones-equipo.repository.js";
import {
  validarEmailInvitacion,
  validarAccionInvitacion,
  comprobarInvitacion,
} from "./invitaciones-equipo.validation.js";

const vencimiento = () => new Date(Date.now() + 7 * 86400000);
async function notificar(invitacion: InvitacionCompleta) {
  let enviada = false;
  try {
    await enviarCorreo(
      correoCuenta({
        para: invitacion.email,
        nombre: null,
        asunto: `Invitación a ${invitacion.estudio.nombre}`,
        clave: `equipo/${invitacion.id}/${invitacion.version}`,
        mensaje: `${invitacion.estudio.nombre} te invitó a formar parte de su equipo en InkManager. Ingresá con una cuenta de artista registrada con este email y revisá la invitación en Mi estudio. Si todavía no tenés cuenta, registrate como artista y verificá tu email. La invitación vence en 7 días. Incorporarte requiere tu aceptación y tener resuelto el trabajo independiente pendiente.`,
        accion: {
          texto: "Revisar invitación",
          url: new URL("/invitacion-equipo", origenesPermitidos[0]).toString(),
        },
      }),
    );
    enviada = true;
  } catch (error) {
    registrarErrorCorreo("No se pudo enviar la invitación al equipo.", error);
  }
  await guardarResultadoEnvio(invitacion.id, invitacion.version, enviada);
  return {
    message: enviada
      ? "Invitación enviada."
      : "Invitación creada, pero no se pudo confirmar el envío del correo. Podés reenviarla desde el equipo.",
    invitacion: presentarInvitacion({
      ...invitacion,
      estadoEnvio: enviada ? "ENVIADA" : "ERROR",
      enviadaAt: enviada ? new Date() : null,
    }),
  };
}
export async function invitarArtista(usuarioId: string, entrada: unknown) {
  const email = validarEmailInvitacion(entrada);
  const invitacion = await conTitular(
    usuarioId,
    async (tx, estudio, cuenta) => {
      if (!cuenta.emailVerificado)
        throw new HttpError(
          403,
          "Verificá tu email antes de invitar artistas.",
        );
      // Serializa invitaciones simultáneas al mismo estudio.
      await tx.$queryRaw`SELECT "id" FROM "Estudio" WHERE "id"=${estudio.id} FOR UPDATE`;
      const destinatario = await tx.usuario.findUnique({
        where: { email },
        select: { id: true, rol: true, estudioId: true },
      });
      if (
        destinatario &&
        (destinatario.rol !== "ARTISTA" || destinatario.estudioId)
      )
        throw new HttpError(
          409,
          "Ese email no corresponde a un artista disponible para incorporarse.",
        );
      await tx.invitacionEquipo.updateMany({
        where: {
          estudioId: estudio.id,
          email,
          estado: "PENDIENTE",
          expiraAt: { lte: new Date() },
        },
        data: { estado: "VENCIDA", version: { increment: 1 } },
      });
      if (
        await tx.invitacionEquipo.findFirst({
          where: { estudioId: estudio.id, email, estado: "PENDIENTE" },
          select: { id: true },
        })
      )
        throw new HttpError(
          409,
          "Ya hay una invitación pendiente para este email. Podés reenviarla desde el equipo.",
        );
      return tx.invitacionEquipo.create({
        data: {
          estudioId: estudio.id,
          creadaPorId: usuarioId,
          email,
          expiraAt: vencimiento(),
          ultimoIntentoAt: new Date(),
        },
        include: detalleInvitacion,
      });
    },
  );
  return notificar(invitacion);
}
export async function gestionarInvitacion(
  usuarioId: string,
  identificador: unknown,
  entrada: unknown,
) {
  const id = validarIdConsulta(identificador),
    { accion, version } = validarAccionInvitacion(entrada, [
      "CANCELAR",
      "REENVIAR",
    ]);
  const invitacion = await conTitular(
    usuarioId,
    async (tx, estudio, cuenta) => {
      await tx.$queryRaw`SELECT "id" FROM "InvitacionEquipo" WHERE "id"=${id} FOR UPDATE`;
      const i = await tx.invitacionEquipo.findFirst({
        where: { id, estudioId: estudio.id },
        include: detalleInvitacion,
      });
      if (!i) throw new HttpError(404, "No encontramos esa invitación.");
      comprobarInvitacion(i, version);
      if (accion === "REENVIAR") {
        if (!cuenta.emailVerificado)
          throw new HttpError(
            403,
            "Verificá tu email antes de enviar invitaciones.",
          );
        if (Date.now() - i.ultimoIntentoAt.getTime() < 60000)
          throw new HttpError(
            429,
            "Esperá un minuto antes de reenviar la invitación.",
          );
        return tx.invitacionEquipo.update({
          where: { id },
          data: {
            version: { increment: 1 },
            expiraAt: vencimiento(),
            ultimoIntentoAt: new Date(),
            estadoEnvio: "PENDIENTE",
            enviadaAt: null,
          },
          include: detalleInvitacion,
        });
      }
      return tx.invitacionEquipo.update({
        where: { id },
        data: {
          estado: "CANCELADA",
          respondidaAt: new Date(),
          version: { increment: 1 },
        },
        include: detalleInvitacion,
      });
    },
  );
  return accion === "REENVIAR"
    ? notificar(invitacion)
    : {
        message: "Invitación cancelada.",
        invitacion: presentarInvitacion(invitacion),
      };
}
export async function responderInvitacion(
  usuarioId: string,
  identificador: unknown,
  entrada: unknown,
) {
  const id = validarIdConsulta(identificador),
    { accion, version } = validarAccionInvitacion(entrada, [
      "ACEPTAR",
      "RECHAZAR",
    ]);
  return conArtista(usuarioId, async (tx, cuenta) => {
    if (!cuenta.emailVerificado)
      throw new HttpError(
        403,
        "Verificá tu email para responder invitaciones.",
      );
    await tx.$queryRaw`SELECT "id" FROM "InvitacionEquipo" WHERE "id"=${id} FOR UPDATE`;
    const i = await tx.invitacionEquipo.findFirst({
      where: { id, email: cuenta.email.toLowerCase() },
      include: detalleInvitacion,
    });
    if (!i)
      throw new HttpError(404, "No encontramos una invitación para tu cuenta.");
    if (
      accion === "ACEPTAR" &&
      i.estado === "ACEPTADA" &&
      i.aceptadaPorId === usuarioId &&
      cuenta.estudioId === i.estudioId
    )
      return { message: "Ya formás parte del estudio." };
    comprobarInvitacion(i, version);
    if (accion === "RECHAZAR") {
      await tx.invitacionEquipo.update({
        where: { id },
        data: {
          estado: "RECHAZADA",
          respondidaAt: new Date(),
          version: { increment: 1 },
        },
      });
      return { message: "Invitación rechazada." };
    }
    validarIngreso(cuenta, await contarPendientes(tx, usuarioId, null));
    const estudio = await tx.estudio.findFirst({
      where: {
        id: i.estudioId,
        propietario: { rol: "ESTUDIO_ADMIN", estudioId: i.estudioId },
      },
      select: { id: true, nombre: true, zonaHoraria: true },
    });
    if (!estudio) throw new HttpError(409, "El estudio ya no está disponible.");
    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        estudioId: estudio.id,
        estadoEnEstudio: "ACTIVO",
        versionEquipo: { increment: 1 },
      },
    });
    await tx.invitacionEquipo.update({
      where: { id },
      data: {
        estado: "ACEPTADA",
        aceptadaPorId: usuarioId,
        respondidaAt: new Date(),
        version: { increment: 1 },
      },
    });
    return { message: `Ya formás parte de ${estudio.nombre}.` };
  });
}
