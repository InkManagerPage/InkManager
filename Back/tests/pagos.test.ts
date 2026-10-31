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
    reemplazar(prisma.suscripcion, "findMany", async () => []),
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

test("cierra intentos pendientes sin pago y permite iniciar otro checkout", async () => {
  const actualizaciones: Array<{
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }> = [];
  const restores = [
    reemplazar(prisma.suscripcion, "findFirst", async () => null),
    reemplazar(prisma.suscripcion, "findMany", async () => [
      { id: "suscripcion-anterior", mercadoPagoId: "preapproval-anterior" },
    ]),
    reemplazar(
      prisma.suscripcion,
      "updateMany",
      async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        actualizaciones.push({ where, data });
        return { count: 1 };
      },
    ),
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
  const originalEnv = new Map(
    ["MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_WEBHOOK_URL", "FRONTEND_URL"].map(
      (name) => [name, process.env[name]],
    ),
  );
  process.env.MERCADOPAGO_ACCESS_TOKEN = "test-access-token";
  process.env.MERCADOPAGO_WEBHOOK_URL =
    "https://hooks.example.test/mercadopago";
  process.env.FRONTEND_URL = "https://inkmanager.example.test";
  const requests: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push(`${init?.method ?? "GET"} ${url}`);
    if (init?.method === "PUT") {
      return new Response(JSON.stringify({ status: "cancelled" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.endsWith("/preapproval/preapproval-anterior")) {
      return new Response(JSON.stringify({ status: "pending" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        id: "preapproval-nuevo",
        init_point:
          "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=nuevo",
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
      { plan: "INDIVIDUAL", ciclo: "MENSUAL" },
    );

    assert.equal("checkoutUrl" in resultado, true);
    assert.equal(actualizaciones[0]?.where.id, "suscripcion-anterior");
    assert.equal(actualizaciones[0]?.where.estado, "PENDIENTE");
    assert.equal(actualizaciones[0]?.data.estado, "ERROR");
    assert.equal(
      requests.some((request) => request.startsWith("PUT ")),
      true,
    );
    assert.equal(
      requests.some((request) => request.startsWith("POST ")),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    restores.reverse().forEach((restore) => restore());
    for (const [name, value] of originalEnv) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("crea una suscripción con token seguro sin enviar datos de tarjeta", async () => {
  const restores = [
    reemplazar(prisma.suscripcion, "findFirst", async () => null),
    reemplazar(prisma.suscripcion, "findMany", async () => []),
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
  const originalEnv = new Map(
    ["MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_WEBHOOK_URL", "FRONTEND_URL"].map(
      (name) => [name, process.env[name]],
    ),
  );
  process.env.MERCADOPAGO_ACCESS_TOKEN = "test-access-token";
  process.env.MERCADOPAGO_WEBHOOK_URL =
    "https://hooks.example.test/mercadopago";
  process.env.FRONTEND_URL = "https://inkmanager.example.test";
  let cuerpo: Record<string, unknown> | undefined;

  globalThis.fetch = async (_input, init) => {
    cuerpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: "preapproval-card",
        status: "authorized",
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
      {
        plan: "INDIVIDUAL",
        ciclo: "MENSUAL",
        card_token_id: "token-seguro-de-prueba",
      },
    );

    assert.deepEqual(resultado, { paymentProcessing: true });
    assert.equal(cuerpo?.card_token_id, "token-seguro-de-prueba");
    assert.equal(cuerpo?.status, "authorized");
    assert.equal("card_number" in (cuerpo ?? {}), false);
    assert.equal("security_code" in (cuerpo ?? {}), false);
    assert.equal(
      (cuerpo?.auto_recurring as Record<string, unknown>)?.transaction_amount,
      12000,
    );
  } finally {
    globalThis.fetch = originalFetch;
    restores.reverse().forEach((restore) => restore());
    for (const [name, value] of originalEnv) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
