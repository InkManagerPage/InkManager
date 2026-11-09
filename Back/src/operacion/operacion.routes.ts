import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { resolverAmbito } from "../solicitudes/solicitudes.service.js";
import {
  objetoEntrada,
  validarIdConsulta,
} from "../solicitudes/solicitudes.validation.js";
import {
  obtenerUbicacion,
  validarCiudad,
} from "../ubicaciones/ubicaciones.service.js";
import {
  tiposCliente,
  validarExcepciones,
  validarPreferencias,
} from "../recordatorios/recordatorios.validation.js";
import { leerAvisos, listarAvisos } from "./avisos.repository.js";
import { resumenMensajes } from "../mensajes/mensajes.service.js";

export const operacionRouter = Router();
operacionRouter.use(requerirSesion, requerirRoles("ARTISTA", "ESTUDIO_ADMIN"));

const perfil = {
  nombre: true,
  biografia: true,
  emailContacto: true,
  telefono: true,
  ciudad: true,
  ciudadId: true,
  direccion: true,
  plazoPropuestasHoras: true,
  propietarioId: true,
} satisfies Prisma.EstudioSelect;

function presentarEstudio(
  e: Prisma.EstudioGetPayload<{ select: typeof perfil }>,
  email: string,
) {
  const ubicacion = obtenerUbicacion(e.ciudadId);
  return {
    nombre: e.nombre,
    biografia: e.biografia || "",
    email: e.emailContacto || email,
    telefono: e.telefono || "",
    ciudad: e.ciudad || "",
    ciudadId: e.ciudadId,
    pais: ubicacion?.pais || null,
    provinciaId: ubicacion?.provinciaId || null,
    direccion: e.direccion || "",
    plazoPropuestasHoras: e.plazoPropuestasHoras,
  };
}

operacionRouter.get("/", async (req, res) => {
  const a = await resolverAmbito(req.usuario!.id);
  const [preferencias, estudio, notificaciones, conversaciones] =
    await Promise.all([
      prisma.preferenciasCorreo.findUnique({
        where: { usuarioId: a.usuarioId },
        select: { reglas: true },
      }),
      a.estudioId
        ? prisma.estudio.findUnique({
            where: { id: a.estudioId },
            select: perfil,
          })
        : null,
      listarAvisos(a.usuarioId),
    resumenMensajes(a),
    ]);
  const clientes =
    a.estudioId && !a.administra && estudio?.propietarioId
      ? await prisma.preferenciasCorreo.findUnique({
          where: { usuarioId: estudio.propietarioId },
          select: { reglas: true },
        })
      : preferencias;
  res.json({
    recordatorios: preferencias?.reglas || null,
    recordatoriosClientes: clientes?.reglas || null,
    puedeEditarClientes: a.administra,
    notificaciones,
    conversaciones: [...conversaciones.canales, ...conversaciones.whatsapp],
    estudio:
      estudio && a.administra ? presentarEstudio(estudio, a.email) : null,
  });
});

operacionRouter.put("/recordatorios", async (req, res) => {
  const a = await resolverAmbito(req.usuario!.id);
  if (!a.administra && !a.puedeProponer)
    throw new HttpError(403, "Tu acceso está suspendido.");
  const reglas = validarPreferencias(req.body);
  if (!a.administra) {
    // Solo el titular decide si se envían correos a los clientes del estudio.
    reglas.clientesHabilitados = false;
    for (const tipo of tiposCliente) reglas.reglas[tipo].activo = false;
  }
  await prisma.preferenciasCorreo.upsert({
    where: { usuarioId: a.usuarioId },
    create: { usuarioId: a.usuarioId, reglas },
    update: { reglas },
  });
  res.sendStatus(204);
});

operacionRouter.patch("/notificaciones", async (req, res) => {
  const { id } = objetoEntrada(req.body);
  await leerAvisos(
    req.usuario!.id,
    id === undefined ? undefined : validarIdConsulta(id),
  );
  res.sendStatus(204);
});

function texto(valor: unknown, campo: string, minimo: number, maximo: number) {
  if (
    typeof valor !== "string" ||
    valor.trim().length < minimo ||
    valor.trim().length > maximo
  )
    throw new HttpError(400, "Revisá el campo " + campo + ".");
  return valor.trim();
}

operacionRouter.patch(
  "/estudio",
  requerirRoles("ESTUDIO_ADMIN"),
  async (req, res) => {
    const a = await resolverAmbito(req.usuario!.id);
    const b = objetoEntrada(req.body);
    const data: Prisma.EstudioUpdateManyMutationInput = {};
    if (b.horas !== undefined) {
      if (
        typeof b.horas !== "number" ||
        !Number.isInteger(b.horas) ||
        b.horas < 0 ||
        b.horas > 720
      )
        throw new HttpError(400, "Elegí un plazo de 0 a 720 horas.");
      data.plazoPropuestasHoras = b.horas;
    } else {
      data.nombre = texto(b.nombre, "nombre", 2, 80);
      data.biografia = texto(b.biografia, "descripción", 10, 300);
      data.emailContacto = texto(b.email, "correo", 3, 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailContacto))
        throw new HttpError(400, "Ingresá un correo válido.");
      data.telefono = texto(b.telefono, "teléfono", 7, 30);
      if (!/^[+\d\s()-]+$/.test(data.telefono))
        throw new HttpError(400, "Ingresá un teléfono válido.");
      data.direccion = texto(b.direccion, "dirección", 5, 160);
      if (b.ciudadId !== null) Object.assign(data, validarCiudad(b.ciudadId));
    }
    const { count } = await prisma.estudio.updateMany({
      where: { id: a.estudioId!, propietarioId: a.usuarioId },
      data,
    });
    if (!count) throw new HttpError(404, "No encontramos tu estudio.");
    res.sendStatus(204);
  },
);

operacionRouter.patch("/contactos/:id", async (req, res) => {
  const a = await resolverAmbito(req.usuario!.id);
  if (!a.administra)
    throw new HttpError(403, "Solo el titular puede editar los contactos.");
  const b = objetoEntrada(req.body);
  const telefono = texto(b.telefono, "teléfono", 0, 30);
  if (telefono && !/^[+\d\s()-]{7,30}$/.test(telefono))
    throw new HttpError(400, "Ingresá un teléfono válido.");
  const { count } = await prisma.contacto.updateMany({
    where: {
      id: validarIdConsulta(req.params.id),
      estudioId: a.estudioId,
      ...(a.estudioId ? {} : { artistaId: a.usuarioId }),
    },
    data: {
      nombre: texto(b.nombre, "nombre", 2, 80),
      telefono: telefono || null,
      ciudad: texto(b.ciudad, "ciudad", 0, 100) || null,
      notas: texto(b.notas, "notas", 0, 1000),
      recordatorios: validarExcepciones(b.recordatorios),
    },
  });
  if (!count) throw new HttpError(404, "No encontramos ese contacto.");
  res.sendStatus(204);
});
