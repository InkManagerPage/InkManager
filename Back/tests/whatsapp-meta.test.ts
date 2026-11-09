import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpError } from "../src/errors/http-error.js";
import {
  verificarAltaMeta,
  type ConfiguracionMeta,
} from "../src/whatsapp/whatsapp.proveedor.js";

const config: ConfiguracionMeta = {
  appId: "123",
  configId: "456",
  secreto: "secreto-qa",
  verificacion: "qa",
  version: "v24.0",
  clave: Buffer.alloc(32),
};

test("Meta valida el WABA autorizado y la pertenencia del número antes de devolver el token", async () => {
  const original = globalThis.fetch;
  const rutas: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const ruta = url.pathname.replace("/v24.0/", "");
    rutas.push(ruta);
    if (ruta === "oauth/access_token") {
      assert.equal(url.searchParams.get("code"), "codigo-qa");
      return Response.json({ access_token: "token-qa" });
    }
    if (ruta === "debug_token") {
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer 123|secreto-qa",
      );
      return Response.json({
        data: {
          app_id: "123",
          is_valid: true,
          expires_at: 0,
          scopes: ["whatsapp_business_messaging"],
          granular_scopes: [
            {
              scope: "whatsapp_business_management",
              target_ids: ["101", "102"],
            },
          ],
        },
      });
    }
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer token-qa",
    );
    assert.ok(url.searchParams.get("appsecret_proof"));
    if (ruta === "102/phone_numbers")
      return Response.json({ data: [{ id: "303" }] });
    if (ruta === "101/phone_numbers") {
      if (!url.searchParams.has("after"))
        return Response.json({
          data: [{ id: "301" }],
          paging: {
            next: "https://externo.example",
            cursors: { after: "pagina-2" },
          },
        });
      assert.equal(url.hostname, "graph.facebook.com");
      assert.equal(url.searchParams.get("after"), "pagina-2");
      return Response.json({ data: [{ id: "302" }] });
    }
    assert.equal(ruta, "302");
    return Response.json({
      id: "302",
      display_phone_number: "+54 11 1234 5678",
      is_on_biz_app: true,
      platform_type: "CLOUD_API",
    });
  };
  try {
    await assert.rejects(
      verificarAltaMeta(config, "codigo-qa", ["999"], "302"),
      (e: unknown) => e instanceof HttpError && e.status === 403,
    );
    assert.deepEqual(rutas.splice(0), ["oauth/access_token", "debug_token"]);
    await assert.rejects(
      verificarAltaMeta(config, "codigo-qa", ["101"], "999"),
      (e: unknown) => e instanceof HttpError && e.status === 403,
    );
    assert.equal(rutas.splice(0).includes("999"), false);
    const resultado = await verificarAltaMeta(
      config,
      "codigo-qa",
      ["999", "102", "101"],
      "302",
    );
    assert.equal(resultado.requierePin, false);
    assert.equal(resultado.wabaId, "101");
    assert.equal(resultado.expiraAt, null);
    assert.deepEqual(rutas, [
      "oauth/access_token",
      "debug_token",
      "102/phone_numbers",
      "101/phone_numbers",
      "101/phone_numbers",
      "302",
    ]);
  } finally {
    globalThis.fetch = original;
  }
});
