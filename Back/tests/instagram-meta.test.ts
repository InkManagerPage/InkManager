import assert from "node:assert/strict";
import { test } from "node:test";
import {
  autorizarInstagram,
  CuentaInstagramNoSeleccionada,
  enviarInstagram,
  suscribirInstagram,
  urlInstagram,
  type ConfigInstagram,
} from "../src/instagram/instagram.proveedor.js";

const config: ConfigInstagram = {
  appId: "123",
  appSecret: "secreto-qa",
  configId: "456",
  version: "v24.0",
  clave: Buffer.alloc(32),
  redirect: "https://inkmanager.example/api/mensajes/instagram/callback",
};

test("Instagram inicia Unified Login con su configuración y el estado de la sesión", () => {
  const url = new URL(urlInstagram(config, "estado-qa"));
  assert.equal(url.origin + url.pathname, "https://www.facebook.com/dialog/oauth");
  assert.equal(url.searchParams.get("client_id"), "123");
  assert.equal(url.searchParams.get("config_id"), "456");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("override_default_response_type"), "true");
  assert.equal(url.searchParams.get("state"), "estado-qa");
  assert.equal(url.searchParams.get("redirect_uri"), config.redirect);
  assert.equal(url.searchParams.has("client_secret"), false);
  assert.equal(url.searchParams.has("scope"), false);
  const anterior = new URL(urlInstagram({ ...config, configId: null }, "estado-qa"));
  assert.equal(anterior.origin, "https://www.instagram.com");
  assert.match(anterior.searchParams.get("scope") ?? "", /instagram_business_manage_messages/);
});

test("Instagram autoriza solo una cuenta, suscribe mensajes y responde usando su API", async (t) => {
  let segundaPagina: { id: string; username: string }[] = [];
  let sinCuentas = false;
  const rutas: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: URL, init: RequestInit = {}) => {
    const url = new URL(input);
    const ruta = url.pathname;
    rutas.push(ruta);
    if (ruta === "/v24.0/oauth/access_token") {
      assert.equal(url.hostname, "graph.facebook.com");
      assert.equal(url.searchParams.get("redirect_uri"), config.redirect);
      assert.equal(url.searchParams.get("client_secret"), config.appSecret);
      assert.equal(url.searchParams.get("code"), "codigo-qa");
      return Response.json({ access_token: "token-qa" });
    }
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer token-qa");
    if (ruta === "/v24.0/me/assigned_instagram_accounts") {
      assert.equal(url.hostname, "graph.facebook.com");
      assert.equal(url.searchParams.get("fields"), "id,username");
      if (sinCuentas) return Response.json({ data: [] });
      if (url.searchParams.has("after")) {
        assert.equal(url.searchParams.get("after"), "pagina-2");
        return Response.json({ data: segundaPagina });
      }
      return Response.json({
        data: [{ id: "789", username: "estudio.qa" }],
        paging: { next: "https://externo.example", cursors: { after: "pagina-2" } },
      });
    }
    assert.equal(init.method, "POST");
    if (ruta === "/v24.0/789/subscribed_apps") {
      assert.equal(url.hostname, "graph.facebook.com");
      assert.equal(String(init.body), "subscribed_fields=messages");
      return Response.json({ success: true });
    }
    assert.equal(ruta, "/v24.0/789/messages");
    assert.deepEqual(JSON.parse(String(init.body)), {
      recipient: { id: "101" },
      message: { text: "Hola" },
    });
    return Response.json({ message_id: url.hostname });
  });

  const perfil = await autorizarInstagram(config, "codigo-qa");
  assert.deepEqual(perfil, {
    cuentaId: "789",
    usuarioCanal: "estudio.qa",
    token: "token-qa",
    expiraAt: null,
    loginUnificado: true,
  });
  await suscribirInstagram(config, perfil);
  assert.equal(rutas.at(-1), "/v24.0/789/subscribed_apps");
  assert.equal(
    await enviarInstagram(config, perfil, "101", "Hola"),
    "graph.facebook.com",
  );
  assert.equal(
    await enviarInstagram(config, { ...perfil, loginUnificado: false }, "101", "Hola"),
    "graph.instagram.com",
  );

  segundaPagina = [{ id: "999", username: "otra.cuenta" }];
  await assert.rejects(
    autorizarInstagram(config, "codigo-qa"),
    (error: unknown) => error instanceof CuentaInstagramNoSeleccionada && error.resultado === "varias_cuentas",
  );
  sinCuentas = true;
  await assert.rejects(
    autorizarInstagram(config, "codigo-qa"),
    (error: unknown) => error instanceof CuentaInstagramNoSeleccionada && error.resultado === "sin_cuenta",
  );
});
