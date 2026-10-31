import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { HttpError } from "../src/errors/http-error.js";
import { prisma } from "../src/config/prisma.js";
import { crearSuscripcion } from "../src/pagos/pagos.service.js";
import { obtenerPrecio, validarPlanYCiclo } from "../src/pagos/planes.js";
import { validarFirmaWebhook } from "../src/pagos/pagos.service.js";

function reemplazar(target: object, key: string, value: unknown): () => void {
  const record = target as Record<string, unknown>;
  const original = record[key];
  record[key] = value;
  return () => {
    record[key] = original;
  };
}

test("precios mensuales y anuales aplican dos meses bonificados", () => {
  assert.equal(obtenerPrecio("INDIVIDUAL", "MENSUAL"), 12000);
  assert.equal(obtenerPrecio("ESTUDIO", "MENSUAL"), 35000);
  assert.equal(obtenerPrecio("INDIVIDUAL", "ANUAL"), 120000);
  assert.equal(obtenerPrecio("ESTUDIO", "ANUAL"), 350000);
});

test("la solicitud de plan rechaza opciones que no están habilitadas", () => {
  assert.deepEqual(validarPlanYCiclo({ plan: "INDIVIDUAL", ciclo: "ANUAL" }), {
    plan: "INDIVIDUAL",
    ciclo: "ANUAL",
  });
  assert.throws(
    () => validarPlanYCiclo({ plan: "PRO", ciclo: "MENSUAL" }),
    (error: unknown) =>
      error instanceof Error && error.message.includes("plan"),
  );
  assert.throws(() => validarPlanYCiclo(null), HttpError);
});

test("valida la firma HMAC del webhook y rechaza datos alterados", () => {
  const secret = "secreto-de-prueba";
  const id = "test-payment-123";
  const requestId = "request-456";
  const timestamp = "1704908010";
  const manifest = `id:${id};request-id:${requestId};ts:${timestamp};`;
  const digest = createHmac("sha256", secret).update(manifest).digest("hex");
  const signature = `ts=${timestamp},v1=${digest}`;

  assert.equal(validarFirmaWebhook(signature, requestId, id, secret), true);
  assert.equal(
    validarFirmaWebhook(signature, "otro-request", id, secret),
    false,
  );
  assert.equal(
    validarFirmaWebhook(signature, requestId, "otro-id", secret),
    false,
  );
  assert.equal(validarFirmaWebhook("v1=invalid", requestId, id, secret), false);
});

test("crea checkout alojado con precio del servidor y sin datos de tarjeta", async () => {
  const restores = [
    reemplazar(prisma.suscripcion, "findFirst", async () => null),
    reemplazar(
      prisma.suscripcion,
      "create",
      async ({ data }: { data: Record<string, unknown> }) => data,
    ),
    reemplazar(
      prisma.suscripcion,
      "update",
      async ({
        where,
        data,
      }: {
        where: Record<string, string>;
        data: Record<string, unknown>;
      }) => ({
        id: where.id,
        ...data,
      }),
    ),
  ];
  const originalFetch = globalThis.fetch;
  const nombres = [
    "MERCADOPAGO_ACCESS_TOKEN",
    "MERCADOPAGO_WEBHOOK_URL",
    "FRONTEND_URL",
  ] as const;
  const originalEnv = new Map(nombres.map((name) => [name, process.env[name]]));
  process.env.MERCADOPAGO_ACCESS_TOKEN = "test-access-token";
  process.env.MERCADOPAGO_WEBHOOK_URL =
    "https://hooks.example.test/mercadopago";
  process.env.FRONTEND_URL = "https://inkmanager.example.test";

  let solicitud:
    { body: Record<string, unknown>; headers: Headers } | undefined;
  globalThis.fetch = async (_input, init) => {
    solicitud = {
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      headers: new Headers(init?.headers),
    };
    return new Response(
      JSON.stringify({
        id: "preapproval-test",
        init_point:
          "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=test",
        next_payment_date: "2026-11-30T00:00:00.000Z",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const resultado = await crearSuscripcion(
      {
        id: "usuario-test",
        email: "artista@example.test",
        nombre: "Artista",
        rol: "ARTISTA",
        estudioId: null,
      },
      { plan: "INDIVIDUAL", ciclo: "MENSUAL", monto: 1 },
    );
    const autoRecurring = solicitud?.body.auto_recurring as
      Record<string, unknown> | undefined;
    assert.equal(
      resultado.checkoutUrl.startsWith("https://www.mercadopago.com.ar/"),
      true,
    );
    assert.equal(autoRecurring?.transaction_amount, 12000);
    assert.equal(solicitud?.body.payer_email, "artista@example.test");
    assert.equal(
      solicitud?.body.notification_url,
      process.env.MERCADOPAGO_WEBHOOK_URL,
    );
    assert.equal(
      solicitud?.headers.get("Authorization"),
      "Bearer test-access-token",
    );
    assert.equal("card_number" in (solicitud?.body ?? {}), false);
  } finally {
    globalThis.fetch = originalFetch;
    restores.reverse().forEach((restore) => restore());
    for (const name of nombres) {
      const value = originalEnv.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
