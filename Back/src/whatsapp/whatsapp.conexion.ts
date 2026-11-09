import { Prisma, type ConexionWhatsApp } from "@prisma/client";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/auth.js";
import { prisma } from "../config/prisma.js";
import { abrirToken, cifrarToken } from "../config/seguridad-integraciones.js";
import { HttpError } from "../errors/http-error.js";
import { objetoEntrada } from "../solicitudes/solicitudes.validation.js";
import {
  configuracionMeta,
  configuracionWhatsApp,
  esIdMeta,
  registrarNumeroMeta,
  suscribirCuentaMeta,
  verificarAltaMeta,
  type ConfiguracionMeta,
} from "./whatsapp.proveedor.js";

const audiencia = "inkmanager-whatsapp";
type Identidad = Pick<ConexionWhatsApp, "estudioId" | "numeroId" | "wabaId">;
const libre = (ahora: Date) => ({
  OR: [{ bloqueoHasta: null }, { bloqueoHasta: { lte: ahora } }],
});

function asociacion(c: Identidad) {
  return JSON.stringify([c.estudioId, c.numeroId, c.wabaId]);
}

function cifrar(config: ConfiguracionMeta, c: Identidad, token: string) {
  return cifrarToken(config.clave, asociacion(c), token);
}

export function descifrarWhatsApp(
  config: ConfiguracionMeta,
  c: Identidad,
  token: string,
) {
  return abrirToken(config.clave, asociacion(c), token);
}

export function autorizada(c: {
  tokenCifrado: string | null;
  expiraAt: Date | null;
}) {
  return Boolean(c.tokenCifrado && (!c.expiraAt || c.expiraAt > new Date()));
}

function configRequerida() {
  const config = configuracionMeta();
  if (!config)
    throw new HttpError(
      503,
      "La conexión con Meta todavía no está habilitada.",
    );
  return config;
}

export async function estadoConexion(estudioId: string, sesionId: string) {
  const c = await prisma.conexionWhatsApp.findUnique({ where: { estudioId } });
  const config = configuracionMeta();
  const piloto = !c && configuracionWhatsApp()?.estudioId === estudioId;
  const estado =
    c && autorizada(c)
      ? c.activadaAt
        ? "CONECTADA"
        : c.requierePin
          ? "REQUIERE_PIN"
          : "PENDIENTE"
      : c?.tokenCifrado
        ? "VENCIDA"
        : piloto
          ? "PILOTO"
          : "SIN_CONEXION";
  return {
    estado,
    telefono: c?.telefono ?? null,
    meta: config
      ? {
          appId: config.appId,
          configId: config.configId,
          version: config.version,
          intento: jwt.sign({ estudioId }, jwtSecret, {
            algorithm: "HS256",
            audience: audiencia,
            subject: sesionId,
            expiresIn: "45m",
          }),
        }
      : null,
  };
}

export async function guardarConexion(
  estudioId: string,
  sesionId: string,
  entrada: unknown,
) {
  const config = configRequerida();
  const { intento, code, wabaIds, numeroId } = objetoEntrada(entrada);
  if (
    typeof intento !== "string" ||
    intento.length > 1000 ||
    typeof code !== "string" ||
    !code.trim() ||
    code.length > 4096 ||
    !Array.isArray(wabaIds) ||
    !wabaIds.length ||
    wabaIds.length > 5 ||
    !wabaIds.every(esIdMeta) ||
    !esIdMeta(numeroId)
  )
    throw new HttpError(
      400,
      "Meta no devolvió los datos completos del número.",
    );
  try {
    const datos = jwt.verify(intento, jwtSecret, {
      algorithms: ["HS256"],
      audience: audiencia,
      subject: sesionId,
    });
    if (typeof datos !== "object" || datos.estudioId !== estudioId)
      throw new Error();
  } catch {
    throw new HttpError(
      403,
      "La conexión venció. Volvé a abrir el asistente de Meta.",
    );
  }

  const anterior = await prisma.conexionWhatsApp.findUnique({
    where: { estudioId },
  });
  if (anterior && autorizada(anterior))
    throw new HttpError(
      409,
      "Ya hay un número vinculado. Desconectalo antes de vincular otro.",
    );
  const piloto = configuracionWhatsApp();
  if (piloto?.numeroId === numeroId && piloto.estudioId !== estudioId)
    throw new HttpError(409, "Ese número ya está asociado a otro negocio.");
  const historialAjeno = await prisma.conversacionWhatsApp.findFirst({
    where: {
      numeroId,
      OR: [{ estudioId: null }, { estudioId: { not: estudioId } }],
    },
    select: { id: true },
  });
  if (historialAjeno)
    throw new HttpError(409, "Ese número ya está asociado a otro negocio.");

  const autorizacion = await verificarAltaMeta(
    config,
    code,
    [...new Set(wabaIds)],
    numeroId,
  );
  const { wabaId } = autorizacion;
  const datos = {
    numeroId,
    wabaId,
    telefono: autorizacion.telefono,
    expiraAt: autorizacion.expiraAt,
    tokenCifrado: cifrar(
      config,
      { estudioId, numeroId, wabaId },
      autorizacion.token,
    ),
    requierePin: autorizacion.requierePin,
    activadaAt: null,
    bloqueoHasta: null,
  };
  try {
    const cambio = anterior
      ? await prisma.conexionWhatsApp.updateMany({
          where: {
            estudioId,
            ...libre(new Date()),
            tokenCifrado: anterior.tokenCifrado,
          },
          data: datos,
        })
      : await prisma.conexionWhatsApp.createMany({
          data: [{ estudioId, ...datos }],
          skipDuplicates: true,
        });
    if (!cambio.count)
      throw new HttpError(
        409,
        "El número ya está vinculado o la conexión cambió.",
      );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new HttpError(
        409,
        "Ese número o cuenta de WhatsApp ya está vinculado a otro negocio.",
      );
    throw error;
  }
  return { requierePin: datos.requierePin };
}

export async function activarConexion(estudioId: string, entrada: unknown) {
  const config = configRequerida();
  const { pin } = objetoEntrada(entrada);
  const c = await prisma.conexionWhatsApp.findUnique({ where: { estudioId } });
  if (!c?.tokenCifrado || !autorizada(c))
    throw new HttpError(409, "Primero autorizá un número en Meta.");
  if (c.activadaAt) return;
  if (c.requierePin && (typeof pin !== "string" || !/^\d{6}$/.test(pin)))
    throw new HttpError(
      400,
      "Ingresá un PIN de seis dígitos para registrar el número en Meta.",
    );

  const ahora = new Date();
  const bloqueoHasta = new Date(ahora.getTime() + 60000);
  const reserva = await prisma.conexionWhatsApp.updateMany({
    where: {
      estudioId,
      ...libre(ahora),
      tokenCifrado: c.tokenCifrado,
      activadaAt: null,
    },
    data: { bloqueoHasta },
  });
  if (!reserva.count)
    throw new HttpError(409, "Ya hay un intento de activación en curso.");
  const intento = { estudioId, bloqueoHasta, tokenCifrado: c.tokenCifrado };
  try {
    const token = descifrarWhatsApp(config, c, c.tokenCifrado);
    if (c.requierePin) {
      await registrarNumeroMeta(config, c.numeroId, token, pin as string);
      await prisma.conexionWhatsApp.updateMany({
        where: intento,
        data: { requierePin: false },
      });
    }
    await suscribirCuentaMeta(config, c.wabaId, token);
    await prisma.conexionWhatsApp.updateMany({
      where: intento,
      data: { activadaAt: new Date() },
    });
  } finally {
    await prisma.conexionWhatsApp.updateMany({
      where: intento,
      data: { bloqueoHasta: null },
    });
  }
}

export async function desconectarConexion(estudioId: string) {
  const cambio = await prisma.conexionWhatsApp.updateMany({
    where: { estudioId, ...libre(new Date()) },
    data: {
      tokenCifrado: null,
      expiraAt: null,
      activadaAt: null,
      bloqueoHasta: null,
      requierePin: false,
    },
  });
  if (!cambio.count)
    throw new HttpError(
      409,
      "Esperá a que termine la activación antes de desconectar.",
    );
}

export async function configEnvio(
  estudioId: string | null,
  artistaId: string | null,
) {
  if (estudioId) {
    const c = await prisma.conexionWhatsApp.findUnique({
      where: { estudioId },
    });
    if (c) {
      const config = configuracionMeta();
      if (!config || !c.activadaAt || !c.tokenCifrado || !autorizada(c))
        return null;
      const token = descifrarWhatsApp(config, c, c.tokenCifrado);
      return {
        numeroId: c.numeroId,
        token,
        secreto: config.secreto,
        version: config.version,
        tokenCifrado: c.tokenCifrado,
      };
    }
  }
  const piloto = configuracionWhatsApp();
  return piloto &&
    piloto.estudioId === estudioId &&
    piloto.artistaId === artistaId
    ? { ...piloto, tokenCifrado: null }
    : null;
}
