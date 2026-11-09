import { createHmac } from "node:crypto";
import { HttpError } from "../errors/http-error.js";
export { coincide, firmaValida } from "../config/seguridad-integraciones.js";

export function configuracionWebhook() {
  const { WHATSAPP_APP_SECRET: secreto, WHATSAPP_VERIFY_TOKEN: verificacion } =
    process.env;
  return secreto && verificacion ? { secreto, verificacion } : null;
}

export function configuracionMeta() {
  const webhook = configuracionWebhook();
  const {
    WHATSAPP_APP_ID: appId,
    WHATSAPP_CONFIG_ID: configId,
    WHATSAPP_GRAPH_VERSION: version,
    WHATSAPP_TOKEN_KEY: clave,
  } = process.env;
  if (
    !webhook ||
    !esIdMeta(appId) ||
    !esIdMeta(configId) ||
    !version ||
    !/^v\d+\.\d+$/.test(version) ||
    !clave ||
    !/^[\da-f]{64}$/i.test(clave)
  )
    return null;
  return {
    ...webhook,
    appId,
    configId,
    version,
    clave: Buffer.from(clave, "hex"),
  };
}

export function esIdMeta(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{1,30}$/.test(valor);
}

export type ConfiguracionMeta = NonNullable<
  ReturnType<typeof configuracionMeta>
>;

function urlGraph(version: string, ruta: string) {
  return new URL("https://graph.facebook.com/" + version + "/" + ruta);
}

function pruebaToken(token: string, secreto: string) {
  return createHmac("sha256", secreto).update(token).digest("hex");
}

export function configuracionWhatsApp() {
  const {
    WHATSAPP_PHONE_NUMBER_ID: numeroId,
    WHATSAPP_ESTUDIO_ID: estudioId,
    WHATSAPP_ARTISTA_ID: artistaId,
    WHATSAPP_ACCESS_TOKEN: token,
    WHATSAPP_APP_SECRET: secreto,
    WHATSAPP_VERIFY_TOKEN: verificacion,
    WHATSAPP_GRAPH_VERSION: version,
  } = process.env;
  if (
    !numeroId ||
    !/^\d+$/.test(numeroId) ||
    Boolean(estudioId) === Boolean(artistaId) ||
    !token ||
    !secreto ||
    !verificacion ||
    !version ||
    !/^v\d+\.\d+$/.test(version)
  )
    return null;
  return {
    numeroId,
    estudioId: estudioId || null,
    artistaId: artistaId || null,
    token,
    secreto,
    verificacion,
    version,
  };
}

export async function enviarTexto(
  config: { numeroId: string; token: string; version: string; secreto: string },
  destinatario: string,
  texto: string,
  id: string,
) {
  const url = urlGraph(config.version, config.numeroId + "/messages");
  url.searchParams.set(
    "appsecret_proof",
    pruebaToken(config.token, config.secreto),
  );
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: destinatario,
      type: "text",
      text: { body: texto },
      biz_opaque_callback_data: id,
    }),
    signal: AbortSignal.timeout(7500),
    redirect: "error",
  });
  const datos = (await r.json().catch(() => null)) as {
    messages?: { id?: string }[];
    error?: { code?: number };
  } | null;
  if (r.status === 401 || datos?.error?.code === 190)
    throw new HttpError(401, "Volvé a autorizar el número en Meta.");
  if (r.status >= 400 && r.status < 500)
    throw new HttpError(422, "WhatsApp rechazó el mensaje.");
  const proveedorId = datos?.messages?.[0]?.id;
  if (!r.ok || !proveedorId) throw new Error("No se confirmó el envío.");
  return proveedorId;
}

async function graph<T>(
  config: ConfiguracionMeta,
  ruta: string,
  opciones: {
    query?: Record<string, string>;
    token?: string;
    body?: object;
  } = {},
) {
  const url = urlGraph(config.version, ruta);
  for (const [campo, valor] of Object.entries(opciones.query ?? {}))
    url.searchParams.set(campo, valor);
  if (opciones.token && ruta !== "debug_token")
    url.searchParams.set(
      "appsecret_proof",
      pruebaToken(opciones.token, config.secreto),
    );
  const headers = new Headers();
  if (opciones.token) headers.set("Authorization", "Bearer " + opciones.token);
  if (opciones.body) headers.set("Content-Type", "application/json");
  const r = await fetch(url, {
    method: opciones.body ? "POST" : "GET",
    headers,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
    signal: AbortSignal.timeout(7000),
    redirect: "error",
  }).catch(() => {
    throw new HttpError(502, "Meta no respondió. Intentá nuevamente.");
  });
  const datos = (await r.json().catch(() => null)) as
    (T & { error?: { code?: number } }) | null;
  if (r.status === 401 || datos?.error?.code === 190)
    throw new HttpError(
      422,
      "La autorización de Meta venció. Volvé a conectar el número.",
    );
  if (!r.ok || !datos || datos.error)
    throw new HttpError(
      502,
      "Meta rechazó la operación. Revisá el número y los permisos en Meta.",
    );
  return datos;
}

async function perteneceACuenta(
  config: ConfiguracionMeta,
  token: string,
  wabaId: string,
  numeroId: string,
) {
  let cursor: string | undefined;
  for (let pagina = 0; pagina < 8; pagina++) {
    const lista: {
      data?: { id: string }[];
      paging?: { next?: string; cursors?: { after?: string } };
    } = await graph(config, wabaId + "/phone_numbers", {
      token,
      query: {
        fields: "id",
        limit: "100",
        ...(cursor ? { after: cursor } : {}),
      },
    });
    if (lista.data?.some((p) => p.id === numeroId)) return true;
    cursor = lista.paging?.next ? lista.paging.cursors?.after : undefined;
    if (!cursor) break;
  }
  return false;
}

export async function verificarAltaMeta(
  config: ConfiguracionMeta,
  code: string,
  wabaIds: string[],
  numeroId: string,
) {
  const { access_token: token, expires_in: vigencia } = await graph<{
    access_token?: string;
    expires_in?: number;
  }>(config, "oauth/access_token", {
    query: { client_id: config.appId, client_secret: config.secreto, code },
  });
  if (typeof token !== "string" || !token)
    throw new HttpError(
      502,
      "Meta no devolvió una autorización para WhatsApp.",
    );
  const { data } = await graph<{
    data?: {
      app_id?: string;
      is_valid?: boolean;
      expires_at?: number;
      scopes?: string[];
      granular_scopes?: { scope: string; target_ids?: string[] }[];
    };
  }>(config, "debug_token", {
    query: { input_token: token },
    token: config.appId + "|" + config.secreto,
  });
  const cuentasAutorizadas = wabaIds.filter((id) =>
    data?.granular_scopes?.some(
      (scope) =>
        scope.scope === "whatsapp_business_management" &&
        scope.target_ids?.includes(id),
    ),
  );
  if (
    !data?.is_valid ||
    data.app_id !== config.appId ||
    !data.scopes?.includes("whatsapp_business_messaging") ||
    !cuentasAutorizadas.length
  )
    throw new HttpError(
      403,
      "Meta no autorizó esta cuenta de WhatsApp para InkManager.",
    );
  let wabaId: string | undefined;
  for (const id of cuentasAutorizadas) {
    if (await perteneceACuenta(config, token, id, numeroId)) {
      wabaId = id;
      break;
    }
  }
  if (!wabaId)
    throw new HttpError(
      403,
      "Ese número no pertenece a la cuenta autorizada en Meta.",
    );
  const telefono = await graph<{
    id?: string;
    display_phone_number?: string;
    status?: string;
    platform_type?: string;
    is_on_biz_app?: boolean;
  }>(config, numeroId, {
    token,
    query: {
      fields: "id,display_phone_number,status,platform_type,is_on_biz_app",
    },
  });
  if (telefono.id !== numeroId || !telefono.display_phone_number)
    throw new HttpError(502, "Meta no confirmó el número elegido.");
  const expiracion = [
    data.expires_at && data.expires_at * 1000,
    vigencia && Date.now() + vigencia * 1000,
  ].filter(
    (fecha): fecha is number =>
      typeof fecha === "number" && Number.isFinite(fecha) && fecha > 0,
  );
  const expiraAt = expiracion.length ? new Date(Math.min(...expiracion)) : null;
  if (expiraAt && expiraAt <= new Date())
    throw new HttpError(422, "La autorización de Meta venció.");
  return {
    wabaId,
    telefono: telefono.display_phone_number,
    requierePin:
      telefono.platform_type !== "CLOUD_API" ||
      (!telefono.is_on_biz_app && telefono.status !== "CONNECTED"),
    token,
    expiraAt,
  };
}

export async function registrarNumeroMeta(
  config: ConfiguracionMeta,
  numeroId: string,
  token: string,
  pin: string,
) {
  const datos = await graph<{ success?: boolean | string }>(
    config,
    numeroId + "/register",
    {
      token,
      body: { messaging_product: "whatsapp", pin },
    },
  );
  if (datos.success !== true && datos.success !== "true")
    throw new HttpError(502, "Meta no confirmó el registro del número.");
}

export async function suscribirCuentaMeta(
  config: ConfiguracionMeta,
  wabaId: string,
  token: string,
) {
  const datos = await graph<{ success?: boolean | string }>(
    config,
    wabaId + "/subscribed_apps",
    { token, body: {} },
  );
  if (datos.success !== true && datos.success !== "true")
    throw new HttpError(502, "Meta no confirmó la suscripción de mensajes.");
}
