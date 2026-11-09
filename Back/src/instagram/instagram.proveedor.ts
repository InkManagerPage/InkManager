import { HttpError } from "../errors/http-error.js";
import { origenesPermitidos } from "../config/auth.js";

export const callbackInstagram = "/api/mensajes/instagram/callback";
const permisos = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
];

export class CuentaInstagramNoSeleccionada extends HttpError {
  constructor(public resultado: "sin_cuenta" | "varias_cuentas") {
    super(
      422,
      resultado === "sin_cuenta"
        ? "Elegí una cuenta profesional de Instagram para continuar."
        : "Autorizá solo la cuenta de Instagram que querés conectar.",
    );
  }
}

export function configWebhookInstagram() {
  const {
    INSTAGRAM_WEBHOOK_SECRET,
    INSTAGRAM_META_APP_SECRET,
    INSTAGRAM_VERIFY_TOKEN: verificacion,
  } = process.env;
  const secretos = [INSTAGRAM_WEBHOOK_SECRET, INSTAGRAM_META_APP_SECRET].filter(
    (secreto): secreto is string => Boolean(secreto),
  );
  return secretos.length && verificacion ? { secretos, verificacion } : null;
}

export function configuracionInstagram() {
  const webhook = configWebhookInstagram();
  const {
    INSTAGRAM_APP_ID: appId,
    INSTAGRAM_APP_SECRET: appSecret,
    INSTAGRAM_META_APP_ID: metaAppId,
    INSTAGRAM_META_APP_SECRET: metaAppSecret,
    INSTAGRAM_CONFIG_ID: configId,
    INSTAGRAM_GRAPH_VERSION: version,
    INSTAGRAM_TOKEN_KEY: clave,
  } = process.env;
  const origen = origenesPermitidos[0];
  if (
    !webhook ||
    !version ||
    !/^v\d+\.\d+$/.test(version) ||
    !clave ||
    !/^[\da-f]{64}$/i.test(clave) ||
    (process.env.NODE_ENV === "production" && !origen.startsWith("https://"))
  )
    return null;
  const comun = {
    version,
    clave: Buffer.from(clave, "hex"),
    redirect: new URL(callbackInstagram, origen).href,
  };
  if (configId || metaAppId || metaAppSecret) {
    if (!idInstagram(configId) || !idInstagram(metaAppId) || !metaAppSecret)
      return null;
    return { ...comun, configId, appId: metaAppId, appSecret: metaAppSecret };
  }
  if (!idInstagram(appId) || !appSecret) return null;
  return { ...comun, configId: null, appId, appSecret };
}

export type ConfigInstagram = NonNullable<
  ReturnType<typeof configuracionInstagram>
>;

type CredencialInstagram = {
  token: string;
  cuentaId: string;
  loginUnificado: boolean;
};

export function idInstagram(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{1,30}$/.test(valor);
}

export function urlInstagram(config: ConfigInstagram, state: string) {
  if (config.configId) {
    const url = new URL("https://www.facebook.com/dialog/oauth");
    url.search = new URLSearchParams({
      client_id: config.appId,
      config_id: config.configId,
      redirect_uri: config.redirect,
      response_type: "code",
      override_default_response_type: "true",
      prompt: "login",
      state,
    }).toString();
    return url.href;
  }
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirect,
    state,
    response_type: "code",
    scope: permisos.join(","),
    force_authentication: "1",
  }).toString();
  return url.href;
}

async function solicitar<T>(
  url: URL,
  init: RequestInit = {},
  timeout = 6500,
): Promise<T> {
  const respuesta = await fetch(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(timeout),
  }).catch(() => {
    throw new HttpError(502, "Instagram no respondió. Intentá nuevamente.");
  });
  const datos = (await respuesta.json().catch(() => null)) as
    (T & { error?: { code?: number } }) | null;
  if (respuesta.status === 401 || datos?.error?.code === 190)
    throw new HttpError(401, "Volvé a autorizar la cuenta de Instagram.");
  if (!respuesta.ok || !datos || datos.error)
    throw new HttpError(
      respuesta.status >= 400 && respuesta.status < 500 ? 422 : 502,
      "Instagram rechazó la operación. Revisá el acceso a mensajes y los permisos.",
    );
  return datos;
}

function graph(
  config: ConfigInstagram,
  loginUnificado: boolean,
  ruta: string,
  query: Record<string, string> = {},
) {
  const host = loginUnificado ? "graph.facebook.com" : "graph.instagram.com";
  const url = new URL(`https://${host}/${config.version}/${ruta}`);
  url.search = new URLSearchParams(query).toString();
  return url;
}

function autorizacion(token: string) {
  return { Authorization: "Bearer " + token };
}

async function autorizarLoginUnificado(config: ConfigInstagram, code: string) {
  const { access_token: token, expires_in: vigencia } = await solicitar<{
    access_token?: string;
    expires_in?: number;
  }>(graph(config, true, "oauth/access_token", {
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirect,
    code,
  }));
  const expiraAt = vigencia ? new Date(Date.now() + vigencia * 1000) : null;
  if (
    typeof token !== "string" || !token ||
    (vigencia !== undefined && (!Number.isSafeInteger(vigencia) || vigencia < 0)) ||
    (expiraAt && !Number.isFinite(expiraAt.getTime()))
  )
    throw new HttpError(502, "Instagram no confirmó la autorización.");

  let cuenta: { id: string; username: string } | undefined;
  const cursores = new Set<string>();
  let cursor: string | undefined;
  for (let pagina = 0; pagina < 5; pagina++) {
    const respuesta = await solicitar<{
      data?: { id?: string; username?: string }[];
      paging?: { cursors?: { after?: string }; next?: string };
    }>(
      graph(config, true, "me/assigned_instagram_accounts", {
        fields: "id,username",
        limit: "2",
        ...(cursor ? { after: cursor } : {}),
      }),
      { headers: autorizacion(token) },
    );
    if (!Array.isArray(respuesta.data))
      throw new HttpError(502, "Instagram no devolvió la lista de cuentas.");
    for (const perfil of respuesta.data) {
      if (
        !idInstagram(perfil?.id) || typeof perfil.username !== "string" ||
        !/^[\w.]{1,30}$/.test(perfil.username)
      )
        throw new HttpError(422, "Instagram no devolvió un perfil profesional válido.");
      if (cuenta && cuenta.id !== perfil.id)
        throw new CuentaInstagramNoSeleccionada("varias_cuentas");
      cuenta = { id: perfil.id, username: perfil.username };
    }

    const siguiente = respuesta.paging?.cursors?.after;
    if (respuesta.paging?.next && (!siguiente || cursores.has(siguiente)))
      throw new HttpError(502, "Instagram no devolvió el cursor de cuentas.");
    if (
      !siguiente ||
      (!respuesta.paging?.next && (!respuesta.data.length || siguiente === cursor))
    ) {
      if (!cuenta) throw new CuentaInstagramNoSeleccionada("sin_cuenta");
      return {
        cuentaId: cuenta.id,
        usuarioCanal: cuenta.username,
        token,
        expiraAt,
        loginUnificado: true,
      };
    }
    if (cursores.has(siguiente)) break;
    cursores.add(siguiente);
    cursor = siguiente;
  }
  throw new HttpError(502, "Instagram no devolvió la lista completa de cuentas.");
}

export async function autorizarInstagram(
  config: ConfigInstagram,
  code: string,
) {
  if (config.configId) return autorizarLoginUnificado(config, code);
  type TokenCorto = { access_token?: string; permissions?: string[] | string };
  const respuesta = await solicitar<TokenCorto & { data?: TokenCorto[] }>(
    new URL("https://api.instagram.com/oauth/access_token"),
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.appId,
        client_secret: config.appSecret,
        grant_type: "authorization_code",
        redirect_uri: config.redirect,
        code,
      }),
    },
  );
  const corto = respuesta.data?.length === 1 ? respuesta.data[0] : respuesta;
  const otorgados =
    typeof corto.permissions === "string"
      ? corto.permissions.split(",")
      : corto.permissions;
  if (
    typeof corto.access_token !== "string" ||
    !corto.access_token ||
    (otorgados && !permisos.every((p) => otorgados.includes(p)))
  )
    throw new HttpError(
      403,
      "Autorizá el perfil y los mensajes de Instagram para continuar.",
    );
  const intercambio = new URL("https://graph.instagram.com/access_token");
  intercambio.search = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: config.appSecret,
    access_token: corto.access_token,
  }).toString();
  const { access_token: token, expires_in: vigencia } = await solicitar<{
    access_token?: string;
    expires_in?: number;
  }>(intercambio);
  if (
    !token ||
    typeof vigencia !== "number" ||
    !Number.isFinite(vigencia) ||
    vigencia <= 0 ||
    vigencia > 7776000
  )
    throw new HttpError(502, "Instagram no confirmó la autorización.");
  const perfil = await solicitar<{
    user_id?: string;
    id?: string;
    username?: string;
  }>(graph(config, false, "me", { fields: "user_id,username" }), {
    headers: autorizacion(token),
  });
  const cuentaId = idInstagram(perfil.user_id) ? perfil.user_id : perfil.id;
  if (
    !idInstagram(cuentaId) ||
    typeof perfil.username !== "string" ||
    !/^[\w.]{1,30}$/.test(perfil.username)
  )
    throw new HttpError(
      422,
      "Instagram no devolvió un perfil profesional válido.",
    );
  return {
    cuentaId,
    usuarioCanal: perfil.username,
    token,
    expiraAt: new Date(Date.now() + vigencia * 1000),
    loginUnificado: false,
  };
}

export async function suscribirInstagram(
  config: ConfigInstagram,
  { token, cuentaId, loginUnificado }: CredencialInstagram,
) {
  const campos = { subscribed_fields: "messages" };
  const ruta = loginUnificado ? `${cuentaId}/subscribed_apps` : "me/subscribed_apps";
  const datos = await solicitar<{ success?: boolean | string }>(
    graph(config, loginUnificado, ruta, loginUnificado ? {} : campos),
    {
      method: "POST",
      headers: autorizacion(token),
      body: loginUnificado ? new URLSearchParams(campos) : undefined,
    },
  );
  if (datos.success !== true && datos.success !== "true")
    throw new HttpError(
      502,
      "Instagram no confirmó la suscripción a mensajes.",
    );
}

export async function nombreRemitente(
  config: ConfigInstagram,
  { token, loginUnificado }: CredencialInstagram,
  remitente: string,
) {
  const perfil = await solicitar<{ username?: string; name?: string }>(
    graph(config, loginUnificado, remitente, { fields: "username,name" }),
    { headers: autorizacion(token) },
    3000,
  ).catch(() => null);
  if (perfil?.username && /^[\w.]{1,30}$/.test(perfil.username))
    return "@" + perfil.username;
  return typeof perfil?.name === "string"
    ? perfil.name.trim().slice(0, 120)
    : "";
}

export async function enviarInstagram(
  config: ConfigInstagram,
  { token, cuentaId, loginUnificado }: CredencialInstagram,
  destinatario: string,
  texto: string,
) {
  const datos = await solicitar<{ message_id?: string }>(
    graph(config, loginUnificado, cuentaId + "/messages"),
    {
      method: "POST",
      headers: { ...autorizacion(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: destinatario },
        message: { text: texto },
      }),
    },
  );
  if (typeof datos.message_id !== "string" || !datos.message_id)
    throw new HttpError(502, "Instagram no confirmó el envío.");
  return datos.message_id;
}
