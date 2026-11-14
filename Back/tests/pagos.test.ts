import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { HttpError } from "../src/errors/http-error.js";
import { prisma } from "../src/config/prisma.js";
import { cancelarSuscripcion, crearSuscripcion, obtenerEstadoSuscripcion } from "../src/pagos/pagos.service.js";
import { obtenerPrecio, validarPlanYCiclo } from "../src/pagos/planes.js";
import { validarFirmaWebhook } from "../src/pagos/pagos.service.js";

function reemplazar(target: object, key: string, value: unknown): () => void {
  const record = target as Record<string, unknown>;
  const original = record[key];
  record[key] = value;
  return () => {
    if (target === process.env && original === undefined) delete record[key];
    else record[key] = original;
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
  assert.throws(
    () => validarPlanYCiclo({ plan: "INDIVIDUAL", ciclo: "MENSUAL", monto: 1 }),
    HttpError,
  );
  assert.throws(
    () =>
      validarPlanYCiclo({
        plan: "INDIVIDUAL",
        ciclo: "ANUAL",
        card_token_id: "token-seguro-de-prueba",
      }),
    (error: unknown) =>
      error instanceof HttpError && error.message.includes("DNI"),
  );
  assert.throws(() => validarPlanYCiclo(null), HttpError);
  assert.throws(
    () => validarPlanYCiclo({ plan: "ESTUDIO", ciclo: "MENSUAL", payer_email: "sin-correo" }),
    HttpError,
  );
  assert.throws(
    () => validarPlanYCiclo({ plan: "ESTUDIO", ciclo: "ANUAL", payer_email: "qa@example.test" }),
    HttpError,
  );
});

test("el plan individual requiere un artista sin estudio", async () => {
  await assert.rejects(
    crearSuscripcion(
      {
        id: "artista",
        nombre: "Artista",
        email: "artista@example.test",
        rol: "ARTISTA",
        estudioId: "estudio",
      },
      { plan: "INDIVIDUAL", ciclo: "MENSUAL" },
    ),
    (error: unknown) => error instanceof HttpError && error.status === 403,
  );
});

test("producción exige activar los cobros antes de crear una suscripción", async (t) => {
  const ambiente = { ...process.env, NODE_ENV: "production", MERCADOPAGO_COBROS_ACTIVOS: "0" };
  t.after(reemplazar(prisma.suscripcion, "findFirst", () => {
    throw new Error("No debe acceder a pagos");
  }));
  t.mock.method(globalThis, "fetch", () => { throw new Error("No debe consultar a Mercado Pago"); });
  const original = process.env;
  process.env = ambiente;
  try {
    await assert.rejects(
      crearSuscripcion({ id: "artista", nombre: "Artista", email: "qa@example.test", rol: "ARTISTA", estudioId: null }, { plan: "INDIVIDUAL", ciclo: "MENSUAL" }),
      (error: unknown) => error instanceof HttpError && error.status === 503,
    );
  } finally {
    process.env = original;
  }
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
    "MERCADOPAGO_WEBHOOK_SECRET",
    "FRONTEND_URL",
  ] as const;
  const originalEnv = new Map(nombres.map((name) => [name, process.env[name]]));
  process.env.MERCADOPAGO_ACCESS_TOKEN = "test-access-token";
  process.env.MERCADOPAGO_WEBHOOK_SECRET = "test-webhook-secret";
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
      { plan: "INDIVIDUAL", ciclo: "MENSUAL" },
    );
    const autoRecurring = solicitud?.body.auto_recurring as
      Record<string, unknown> | undefined;
    assert.equal(
      resultado.checkoutUrl.startsWith("https://www.mercadopago.com.ar/"),
      true,
    );
    assert.equal(autoRecurring?.transaction_amount, 12000);
    assert.equal(solicitud?.body.status, "pending");
    assert.equal(solicitud?.body.payer_email, "artista@example.test");
    assert.equal(autoRecurring?.frequency, 1);
    assert.equal(autoRecurring?.frequency_type, "months");
    assert.match(String(solicitud?.body.back_url), /\/checkout\/pending\/[\da-f-]{36}$/);
    assert.equal(solicitud?.headers.get("X-Idempotency-Key"), solicitud?.body.external_reference);
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

test("crea un checkout anual con pago único al precio configurado por el servidor", async () => {
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
      }) => ({ id: where.id, ...data }),
    ),
  ];
  const originalFetch = globalThis.fetch;
  const originalEnv = new Map(
    [
      "MERCADOPAGO_ACCESS_TOKEN",
      "MERCADOPAGO_WEBHOOK_URL",
      "MERCADOPAGO_WEBHOOK_SECRET",
      "FRONTEND_URL",
    ].map((name) => [name, process.env[name]]),
  );
  process.env.MERCADOPAGO_ACCESS_TOKEN = "test-access-token";
  process.env.MERCADOPAGO_WEBHOOK_SECRET = "test-webhook-secret";
  process.env.MERCADOPAGO_WEBHOOK_URL = "https://hooks.example.test/mercadopago";
  process.env.FRONTEND_URL = "https://inkmanager.example.test";
  let preferencia: Record<string, unknown> | undefined;

  globalThis.fetch = async (_input, init) => {
    preferencia = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: "preference-anual",
        init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref=anual",
        external_reference: preferencia.external_reference,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const resultado = await crearSuscripcion(
      {
        id: "estudio-test",
        email: "estudio@example.test",
        nombre: "Estudio",
        rol: "ESTUDIO_ADMIN",
        estudioId: "estudio-test",
      },
      { plan: "ESTUDIO", ciclo: "ANUAL" },
    );
    const items = preferencia?.items as Array<Record<string, unknown>> | undefined;
    assert.equal("checkoutUrl" in resultado, true);
    assert.equal(items?.[0]?.unit_price, 350000);
    assert.equal(items?.[0]?.quantity, 1);
    assert.equal(preferencia?.notification_url, process.env.MERCADOPAGO_WEBHOOK_URL);
    assert.equal(preferencia?.auto_return, "approved");
  } finally {
    globalThis.fetch = originalFetch;
    restores.reverse().forEach((restore) => restore());
    for (const [name, value] of originalEnv) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("un checkout pendiente de otro vendedor conserva el intento y explica el bloqueo", async (t) => {
  const restores = [
    reemplazar(prisma.suscripcion, "findFirst", async () => null),
    reemplazar(prisma.suscripcion, "findMany", async () => [{
      id: "intento-anterior",
      plan: "ESTUDIO",
      ciclo: "MENSUAL",
      mercadoPagoId: "123-22222222-2222-4222-8222-222222222222",
    }]),
    reemplazar(prisma.suscripcion, "create", async () => assert.fail("No debe iniciar un checkout nuevo")),
    reemplazar(prisma.suscripcion, "updateMany", async () => assert.fail("No debe cerrar el intento anterior")),
    reemplazar(process.env, "MERCADOPAGO_ACCESS_TOKEN", "credencial-de-prueba"),
    reemplazar(process.env, "MERCADOPAGO_WEBHOOK_SECRET", "secreto-de-prueba"),
    reemplazar(process.env, "MERCADOPAGO_WEBHOOK_URL", "https://example.test/webhook"),
  ];
  t.after(() => restores.reverse().forEach((restaurar) => restaurar()));
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.match(url, /\/checkout\/preferences\//);
    assert.equal(init.method, "GET");
    return Response.json({ message: "caller.id invalid" }, { status: 401 });
  });

  await assert.rejects(
    crearSuscripcion(
      { id: "titular", nombre: "Estudio", email: "titular@example.test", rol: "ESTUDIO_ADMIN", estudioId: "estudio" },
      { plan: "ESTUDIO", ciclo: "MENSUAL" },
    ),
    (error: unknown) => error instanceof HttpError && error.status === 409 &&
      error.message.includes("Mercado Pago no permite verificar"),
  );
});

test("permite otro checkout cuando Mercado Pago confirma que el anterior está cerrado", async () => {
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
    ["MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_WEBHOOK_URL", "MERCADOPAGO_WEBHOOK_SECRET", "FRONTEND_URL"].map(
      (name) => [name, process.env[name]],
    ),
  );
  process.env.MERCADOPAGO_ACCESS_TOKEN = "test-access-token";
  process.env.MERCADOPAGO_WEBHOOK_SECRET = "test-webhook-secret";
  process.env.MERCADOPAGO_WEBHOOK_URL =
    "https://hooks.example.test/mercadopago";
  process.env.FRONTEND_URL = "https://inkmanager.example.test";
  const requests: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push(`${init?.method ?? "GET"} ${url}`);
    if (url.endsWith("/preapproval/preapproval-anterior")) {
      return new Response(JSON.stringify({ status: "cancelled" }), {
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
      false,
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
    ["MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_WEBHOOK_URL", "MERCADOPAGO_WEBHOOK_SECRET", "FRONTEND_URL"].map(
      (name) => [name, process.env[name]],
    ),
  );
  process.env.MERCADOPAGO_ACCESS_TOKEN = "test-access-token";
  process.env.MERCADOPAGO_WEBHOOK_SECRET = "test-webhook-secret";
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

    assert.equal("paymentProcessing" in resultado && resultado.paymentProcessing, true);
    assert.equal("subscriptionId" in resultado, true);
    if ("subscriptionId" in resultado) {
      assert.match(resultado.subscriptionId, /^[\da-f-]{36}$/i);
    }
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

test("un pago en curso o sin respuesta impide volver a cobrar y cancelar antes de confirmar", async (t) => {
  const ambiente = {
    MERCADOPAGO_ACCESS_TOKEN: "test-access-token",
    MERCADOPAGO_WEBHOOK_SECRET: "test-webhook-secret",
    MERCADOPAGO_WEBHOOK_URL: "https://hooks.example.test/mercadopago",
  };
  const original = Object.entries(ambiente).map(([nombre]) => [nombre, process.env[nombre]] as const);
  Object.assign(process.env, ambiente);
  t.after(() => {
    for (const [nombre, valor] of original) {
      if (valor === undefined) delete process.env[nombre];
      else process.env[nombre] = valor;
    }
  });

  let pendiente: Record<string, unknown> | undefined;
  let creaciones = 0;
  t.after(reemplazar(prisma.suscripcion, "findFirst", async ({ where }: { where: Record<string, unknown> }) =>
    where.estado ? pendiente : null,
  ));
  t.after(reemplazar(prisma.suscripcion, "findMany", async () => pendiente ? [pendiente] : []));
  t.after(reemplazar(prisma.suscripcion, "create", async ({ data }: { data: Record<string, unknown> }) => {
    pendiente = { ...data, mercadoPagoId: null, estado: "PENDIENTE" };
    creaciones++;
    return pendiente;
  }));
  t.after(reemplazar(prisma.suscripcion, "updateMany", async () => {
    throw new Error("El intento incierto debe quedar pendiente");
  }));
  let avisarInicio!: () => void;
  let liberarProveedor!: () => void;
  const iniciado = new Promise<void>((resolve) => { avisarInicio = resolve; });
  const continuar = new Promise<void>((resolve) => { liberarProveedor = resolve; });
  const proveedor = t.mock.method(globalThis, "fetch", async () => {
    avisarInicio();
    await continuar;
    throw new Error("El proveedor perdió la conexión");
  });
  const usuario = { id: "usuario-test", email: "artista@example.test", nombre: "Artista", rol: "ARTISTA" as const, estudioId: null };
  const pagar = () => crearSuscripcion(usuario, { plan: "INDIVIDUAL", ciclo: "MENSUAL" });
  const conflicto = (error: unknown) => error instanceof HttpError && error.status === 409;
  const primero = assert.rejects(pagar(), (error: unknown) => error instanceof HttpError && error.status === 502);
  try {
    await iniciado;
    await assert.rejects(pagar(), conflicto);
    await assert.rejects(cancelarSuscripcion(usuario.id, undefined), conflicto);
  } finally {
    liberarProveedor();
    await primero;
  }
  await assert.rejects(pagar(), conflicto);
  assert.equal(creaciones, 1);
  assert.equal(proveedor.mock.callCount(), 1);
});

test("la cancelación inmediata desactiva el plan anual sin reembolso", async (t) => {
  let actualizacion: Record<string, unknown> | undefined;
  t.after(
    reemplazar(prisma.suscripcion, "findFirst", async () => ({
      id: "suscripcion-anual",
      ciclo: "ANUAL",
      estado: "ACTIVA",
      mercadoPagoId: null,
      mpPaymentId: "pago-anual",
      periodoHasta: new Date(Date.now() + 60_000),
      correoCancelacionEnviadoAt: null,
    })),
  );
  t.after(
    reemplazar(
      prisma.suscripcion,
      "update",
      async ({
        data,
      }: {
        data: Record<string, unknown>;
      }) => {
        actualizacion = data;
        return data;
      },
    ),
  );
  t.after(reemplazar(prisma.suscripcion, "findUnique", async () => null));

  const resultado = await cancelarSuscripcion(
    "usuario-test",
    undefined,
    undefined,
    true,
  );
  assert.equal(resultado.estado, "CANCELADA");
  assert.equal(actualizacion?.estado, "CANCELADA");
  assert.equal(actualizacion?.proximoCobroAt, null);
  const periodoHasta = actualizacion?.periodoHasta;
  assert.ok(periodoHasta instanceof Date);
  if (periodoHasta instanceof Date) {
    assert.ok(Math.abs(Date.now() - periodoHasta.getTime()) < 1000);
  }
});

test("cancela el mensual pendiente con el estado que acepta Mercado Pago", async (t) => {
  t.after(reemplazar(process.env, "MERCADOPAGO_ACCESS_TOKEN", "token-de-prueba"));
  t.after(reemplazar(prisma.suscripcion, "findFirst", async () => ({
    id: "mensual-pendiente", ciclo: "MENSUAL", estado: "PENDIENTE",
    mercadoPagoId: "preapproval-test", mpPaymentId: null, periodoHasta: null,
  })));
  t.after(reemplazar(prisma.suscripcion, "findUnique", async () => null));
  t.after(reemplazar(prisma.suscripcion, "update", async ({ data }: { data: Record<string, unknown> }) => {
    assert.equal(data.estado, "CANCELADA");
    return data;
  }));
  const proveedor = t.mock.method(globalThis, "fetch", async (input, init) => {
    if (String(input) === "https://api.mercadopago.com/authorized_payments/search?preapproval_id=preapproval-test")
      return Response.json({ results: [] });
    assert.equal(String(input), "https://api.mercadopago.com/preapproval/preapproval-test");
    assert.equal(init?.method, "PUT");
    assert.deepEqual(JSON.parse(String(init?.body)), { status: "cancelled" });
    return Response.json({ status: "cancelled" });
  });

  assert.equal((await cancelarSuscripcion("usuario-test", undefined)).estado, "CANCELADA");
  assert.equal(proveedor.mock.callCount(), 2);
});

test("verifica el mensual aprobado sin webhook y solo para el titular de la suscripción", async (t) => {
  const id = "suscripcion-test";
  const mercadoPagoId = "preapproval-test";
  const fila = {
    id, mercadoPagoId, referenciaExterna: id, ciclo: "MENSUAL", bonificada: false,
    plan: "ESTUDIO", estado: "PENDIENTE", monto: 100, moneda: "ARS",
    periodoHasta: null, proximoCobroAt: null, usuario: { email: "qa@example.test", nombre: "QA" },
  };
  t.after(reemplazar(process.env, "MERCADOPAGO_ACCESS_TOKEN", "token-de-prueba"));
  t.after(reemplazar(prisma.suscripcion, "findFirst", async ({ where }: { where: Record<string, unknown> }) =>
    where.usuarioId === "titular" || where.OR ? fila : null,
  ));
  t.after(reemplazar(prisma, "$transaction", async (fn: (tx: unknown) => unknown) =>
    fn({
      $queryRaw: async () => [],
      suscripcion: {
        findUnique: async () => fila,
        updateMany: async ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(fila, data);
          return { count: 1 };
        },
      },
      pagoSuscripcion: {
        findUnique: async () => null,
        upsert: async ({ create }: { create: Record<string, unknown> }) => {
          assert.equal(create.estado, "APROBADO");
          assert.equal(create.monto, 100);
          assert.equal(create.suscripcionId, id);
          return { id: "pago-test", correoEnviadoAt: new Date() };
        },
      },
    }),
  ));
  const factura = {
    id: 123, preapproval_id: mercadoPagoId, external_reference: id,
    transaction_amount: 100, currency_id: "ARS", payment: { status: "approved" },
  };
  const proveedor = t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/authorized_payments/search") {
      assert.equal(url.searchParams.get("preapproval_id"), mercadoPagoId);
      return Response.json({ results: [{ ...factura, id: 999, preapproval_id: "ajena" }, factura] });
    }
    if (url.pathname === "/authorized_payments/123") return Response.json(factura);
    assert.equal(url.pathname, "/preapproval/" + mercadoPagoId);
    return Response.json({
      id: mercadoPagoId, external_reference: id,
      next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
  });

  await assert.rejects(obtenerEstadoSuscripcion(id, "otro-usuario", true), { status: 404 });
  assert.equal(proveedor.mock.callCount(), 0);
  assert.equal((await obtenerEstadoSuscripcion(id, "titular")).subscription.estado, "PENDIENTE");
  const verificada = (await obtenerEstadoSuscripcion(id, "titular", true)).subscription;
  assert.equal(verificada.estado, "ACTIVA");
  assert.equal("mercadoPagoId" in verificada, false);
  assert.equal((await obtenerEstadoSuscripcion(id, "titular", true)).subscription.estado, "ACTIVA");
  assert.equal(proveedor.mock.callCount(), 3);
});

test("cierra el checkout anual y confirma que no haya pagos antes de cancelar", async (t) => {
  t.after(reemplazar(process.env, "MERCADOPAGO_ACCESS_TOKEN", "token-de-prueba"));
  const id = "anual-pendiente";
  const preferencia = {
    id: "12345678-00000000-0000-0000-0000-000000000000",
    external_reference: id,
    expires: true,
    expiration_date_from: new Date(Date.now() - 60_000).toISOString(),
    expiration_date_to: new Date(Date.now() + 60_000).toISOString(),
  };
  t.after(reemplazar(prisma.suscripcion, "findFirst", async () => ({
    id, ciclo: "ANUAL", estado: "PENDIENTE", mercadoPagoId: preferencia.id,
    mpPaymentId: null, periodoHasta: null,
  })));
  t.after(reemplazar(prisma.suscripcion, "findUnique", async () => null));
  let busquedaConfirmada = false;
  let cerrada = false;
  t.after(reemplazar(prisma.suscripcion, "updateMany", async ({ where, data }: {
    where: Record<string, unknown>; data: Record<string, unknown>;
  }) => {
    assert.ok(busquedaConfirmada);
    assert.deepEqual(where, { id, estado: "PENDIENTE", mpPaymentId: null });
    assert.equal(data.estado, "CANCELADA");
    return { count: 1 };
  }));
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/checkout/preferences/" + preferencia.id) {
      if (init?.method === "PUT") {
        const vigencia = JSON.parse(String(init.body));
        assert.equal(vigencia.expires, true);
        assert.ok(Date.parse(vigencia.expiration_date_from) < Date.parse(vigencia.expiration_date_to));
        assert.ok(Date.parse(vigencia.expiration_date_to) <= Date.now());
        cerrada = true;
        return Response.json({ ...preferencia, ...vigencia });
      }
      return Response.json(preferencia);
    }
    assert.ok(cerrada);
    assert.equal(url.pathname, "/v1/payments/search");
    assert.equal(url.searchParams.get("external_reference"), id);
    assert.equal(url.searchParams.has("range"), false);
    busquedaConfirmada = true;
    return Response.json({ results: [], paging: { total: 0 } });
  });

  assert.equal((await cancelarSuscripcion("usuario-test", undefined)).estado, "CANCELADA");
});
