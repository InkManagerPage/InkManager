import { randomUUID } from "node:crypto";
import { Prisma, type ConexionCanal } from "@prisma/client";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/auth.js";
import { prisma } from "../config/prisma.js";
import {
  abrirToken,
  cifrarToken,
  coincide,
} from "../config/seguridad-integraciones.js";
import { HttpError } from "../errors/http-error.js";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";
import { tienePlanIndividual } from "../pagos/acceso-plan.js";
import {
  autorizarInstagram,
  configuracionInstagram,
  suscribirInstagram,
  urlInstagram,
} from "./instagram.proveedor.js";

export const canalInstagram = "INSTAGRAM" as const;
const audiencia = "inkmanager-instagram";
export const duracionInstagram = 10 * 60;

export function ambitoInstagram(a: AmbitoConsultas) {
  return {
    estudioId: a.estudioId,
    artistaId: a.estudioId ? null : a.usuarioId,
  };
}

function buscarConexion(a: AmbitoConsultas) {
  return prisma.conexionCanal.findFirst({
    where: { canal: canalInstagram, ...ambitoInstagram(a) },
  });
}

export function activaInstagram(c: ConexionCanal | null) {
  return Boolean(c?.activa && credencialVigenteInstagram(c));
}

export function credencialVigenteInstagram(c: ConexionCanal) {
  return Boolean(
    c.tokenCifrado && (c.expiraAt === null ? c.loginUnificado : c.expiraAt > new Date()),
  );
}

function identidad(
  c: Pick<ConexionCanal, "cuentaId" | "estudioId" | "artistaId">,
) {
  return JSON.stringify([canalInstagram, c.cuentaId, c.estudioId, c.artistaId]);
}

export async function estadoInstagram(a: AmbitoConsultas) {
  await permisoConexion(a);
  const c = await buscarConexion(a);
  return {
    disponible: Boolean(configuracionInstagram()),
    estado: activaInstagram(c)
      ? "CONECTADA"
      : c?.activa
        ? "VENCIDA"
        : "SIN_CONEXION",
    usuario: c?.usuarioCanal ?? null,
  };
}

function permiso(a: AmbitoConsultas) {
  if (!a.administra)
    throw new HttpError(403, "Solo el titular puede conectar Instagram.");
}

async function permisoConexion(a: AmbitoConsultas) {
  permiso(a);
  if (!a.estudioId && !(await tienePlanIndividual(a.usuarioId)))
    throw new HttpError(403, "Necesitás un Plan Individual vigente para conectar Instagram.");
}

export async function iniciarInstagram(a: AmbitoConsultas, sesionId: string) {
  await permisoConexion(a);
  const config = configuracionInstagram();
  if (!config)
    throw new HttpError(503, "Instagram todavía no está habilitado.");
  const state = jwt.sign({ ...ambitoInstagram(a), configId: config.configId }, jwtSecret, {
    subject: sesionId,
    audience: audiencia,
    algorithm: "HS256",
    jwtid: randomUUID(),
    expiresIn: duracionInstagram,
  });
  return { state, url: urlInstagram(config, state) };
}

export function validarEstadoInstagram(
  a: AmbitoConsultas,
  sesionId: string,
  cookie: unknown,
  state: unknown,
) {
  permiso(a);
  try {
    if (
      typeof cookie !== "string" ||
      typeof state !== "string" ||
      state.length > 1000 ||
      !coincide(cookie, state)
    )
      throw new Error();
    const valor = jwt.verify(state, jwtSecret, {
      algorithms: ["HS256"],
      audience: audiencia,
      subject: sesionId,
    });
    const ambito = ambitoInstagram(a);
    if (
      typeof valor !== "object" ||
      valor.configId !== configuracionInstagram()?.configId ||
      valor.estudioId !== ambito.estudioId ||
      valor.artistaId !== ambito.artistaId
    )
      throw new Error();
  } catch {
    throw new HttpError(403, "La autorización de Instagram venció.");
  }
}

export async function guardarInstagram(a: AmbitoConsultas, code: unknown) {
  await permisoConexion(a);
  const config = configuracionInstagram();
  if (!config)
    throw new HttpError(503, "Instagram todavía no está habilitado.");
  if (typeof code !== "string" || !code || code.length > 4096)
    throw new HttpError(400, "Instagram no devolvió la autorización.");
  const anterior = await buscarConexion(a);
  if (activaInstagram(anterior))
    throw new HttpError(409, "Ya hay una cuenta activa en este negocio.");
  const perfil = await autorizarInstagram(config, code);
  const ambito = ambitoInstagram(a);
  const historialAjeno = await prisma.conversacionCanal.findFirst({
    where: {
      canal: canalInstagram,
      cuentaId: perfil.cuentaId,
      ...(ambito.estudioId
        ? {
            OR: [{ estudioId: null }, { estudioId: { not: ambito.estudioId } }],
          }
        : {
            OR: [
              { artistaId: null },
              { artistaId: { not: ambito.artistaId! } },
            ],
          }),
    },
    select: { id: true },
  });
  if (historialAjeno)
    throw new HttpError(
      409,
      "La cuenta de Instagram ya pertenece a otro negocio.",
    );
  const datos = {
    canal: canalInstagram,
    ...ambito,
    cuentaId: perfil.cuentaId,
    usuarioCanal: perfil.usuarioCanal,
    expiraAt: perfil.expiraAt,
    loginUnificado: perfil.loginUnificado,
    tokenCifrado: cifrarToken(
      config.clave,
      identidad({ ...ambito, cuentaId: perfil.cuentaId }),
      perfil.token,
    ),
    activa: false,
  };
  try {
    const reserva = anterior
      ? await prisma.conexionCanal.updateMany({
          where: { id: anterior.id, tokenCifrado: anterior.tokenCifrado },
          data: datos,
        })
      : await prisma.conexionCanal.createMany({
          data: [datos],
          skipDuplicates: true,
        });
    if (!reserva.count)
      throw new HttpError(
        409,
        "La cuenta de Instagram ya está vinculada o la conexión cambió.",
      );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new HttpError(
        409,
        "La cuenta de Instagram ya pertenece a otro negocio.",
      );
    throw error;
  }
  const intento = {
    canal: canalInstagram,
    ...ambito,
    tokenCifrado: datos.tokenCifrado,
  };
  try {
    await suscribirInstagram(config, perfil);
    const resultado = await prisma.conexionCanal.updateMany({
      where: intento,
      data: { activa: true },
    });
    if (!resultado.count)
      throw new HttpError(409, "La conexión cambió durante la autorización.");
  } catch (error) {
    await prisma.conexionCanal.updateMany({
      where: intento,
      data: { tokenCifrado: null },
    });
    throw error;
  }
}

export async function desconectarInstagram(a: AmbitoConsultas) {
  permiso(a);
  await prisma.conexionCanal.updateMany({
    where: { canal: canalInstagram, ...ambitoInstagram(a) },
    data: { activa: false, tokenCifrado: null },
  });
}

export function credencialInstagram(
  c: ConexionCanal,
  config: NonNullable<ReturnType<typeof configuracionInstagram>>,
) {
  if (!activaInstagram(c) || !c.tokenCifrado)
    throw new HttpError(503, "Volvé a conectar la cuenta de Instagram.");
  return {
    cuentaId: c.cuentaId,
    loginUnificado: c.loginUnificado,
    token: abrirToken(config.clave, identidad(c), c.tokenCifrado),
  };
}
