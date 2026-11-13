import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

test("el webhook de renovación extiende el acceso y registra cada factura aprobada una vez", async (t) => {
  const secreto = "webhook-de-prueba";
  const entorno = {
    MERCADOPAGO_WEBHOOK_SECRET: secreto,
    MERCADOPAGO_ACCESS_TOKEN: "token-de-prueba",
    MAIL_TRANSPORT: "resend",
    RESEND_API_KEY: "correo-de-prueba",
    MAIL_FROM: "demo@example.test",
  };
  for (const [clave, valor] of Object.entries(entorno)) {
    const anterior = process.env[clave];
    process.env[clave] = valor;
    t.after(() => {
      if (anterior === undefined) delete process.env[clave];
      else process.env[clave] = anterior;
    });
  }

  const referencia = randomUUID();
  const preapproval = randomUUID();
  const suscripcion = {
    id: referencia, referenciaExterna: referencia, mercadoPagoId: preapproval,
    plan: "ESTUDIO", ciclo: "MENSUAL", bonificada: false, estado: "PENDIENTE",
    monto: 100, moneda: "ARS", periodoHasta: null as Date | null, proximoCobroAt: null as Date | null,
    usuario: { email: "cliente@example.test", nombre: "Prueba" },
  };
  type Pago = { id: string; suscripcionId: string; estado: string; aprobadoAt: Date | null; correoEnviadoAt: Date | null };
  const pagos = new Map<string, Pago>();
  const correos: Array<{ asunto: string; clave: string }> = [];
  const meses = ["2026-11-12", "2026-12-12", "2027-01-12"];
  const fecha = (mes: number) => meses[mes] + "T17:00:00.000Z";
  let proximo = fecha(1);
  let estadoSegundaFactura = "rejected";

  const transaccionOriginal = prisma.$transaction;
  t.after(() => { prisma.$transaction = transaccionOriginal; });
  const transaccion = async (ejecutar: (tx: unknown) => unknown) => ejecutar({
    $queryRaw: async () => [],
    suscripcion: {
      findUnique: async () => suscripcion,
      updateMany: async ({ where, data }: {
        where: { estado?: { in?: string[]; not?: string } };
        data: Partial<typeof suscripcion>;
      }) => {
        const filtro = where.estado;
        if (filtro?.not === suscripcion.estado || (filtro?.in && !filtro.in.includes(suscripcion.estado)))
          return { count: 0 };
        Object.assign(suscripcion, data);
        return { count: 1 };
      },
    },
    pagoSuscripcion: {
      findUnique: async ({ where }: { where: { id?: string; mercadoPagoId?: string } }) =>
        pagos.get(where.id ?? where.mercadoPagoId ?? "") ?? null,
      upsert: async ({ where, create, update }: {
        where: { mercadoPagoId: string }; create: Omit<Pago, "id" | "correoEnviadoAt">; update: Partial<Pago>;
      }) => {
        const anterior = pagos.get(where.mercadoPagoId);
        const pago = anterior ? { ...anterior, ...update } : {
          ...create, id: where.mercadoPagoId, correoEnviadoAt: null,
        };
        pagos.set(where.mercadoPagoId, pago);
        return pago;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Pago> }) => {
        const pago = pagos.get(where.id);
        assert(pago);
        Object.assign(pago, data);
        return pago;
      },
    },
    tokenCancelacion: { create: async () => ({}) },
  });
  prisma.$transaction = transaccion as typeof prisma.$transaction;
  const buscarOriginal = prisma.suscripcion.findFirst;
  t.after(() => { prisma.suscripcion.findFirst = buscarOriginal; });
  prisma.suscripcion.findFirst = (() => Promise.resolve(suscripcion)) as typeof prisma.suscripcion.findFirst;

  const fetchReal = globalThis.fetch;
  const proveedor = t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(String(input));
    if (url.origin === "https://api.resend.com") {
      correos.push({
        asunto: JSON.parse(String(init?.body)).subject,
        clave: new Headers(init?.headers).get("Idempotency-Key") ?? "",
      });
      return Response.json({ id: "correo-prueba" });
    }
    assert.equal(url.origin, "https://api.mercadopago.com");
    if (url.pathname === "/preapproval/" + preapproval) {
      return Response.json({
        id: preapproval, status: "authorized", external_reference: referencia, next_payment_date: proximo,
      });
    }
    const factura = Number(url.pathname.split("/").at(-1));
    assert([101, 102, 103].includes(factura));
    return Response.json({
      id: factura, preapproval_id: preapproval, external_reference: referencia,
      date_created: fecha(factura === 101 ? 0 : 1), transaction_amount: factura === 103 ? 1 : 100,
      currency_id: "ARS", payment: { status: factura === 102 ? estadoSegundaFactura : "approved" },
    });
  });

  const servidor = app.listen(0, "127.0.0.1");
  t.after(() => new Promise<void>((resolve) => servidor.close(() => resolve())));
  await once(servidor, "listening");
  const direccion = servidor.address();
  assert(direccion && typeof direccion === "object");

  async function webhook(id: number, secretoFirma = secreto) {
    const requestId = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const firma = createHmac("sha256", secretoFirma)
      .update(`id:${id};request-id:${requestId};ts:${timestamp};`).digest("hex");
    const response = await fetchReal(`http://127.0.0.1:${direccion.port}/api/webhooks/mercadopago?data.id=${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${firma}`,
      },
      body: JSON.stringify({ type: "subscription_authorized_payment", data: { id } }),
    });
    await response.text();
    return response.status;
  }

  assert.equal(await webhook(101, "incorrecto"), 401);
  assert.equal(proveedor.mock.callCount(), 0);
  assert.equal(await webhook(101), 200);
  assert.equal(suscripcion.estado, "ACTIVA");
  assert.equal(suscripcion.periodoHasta?.toISOString(), fecha(1));

  assert.equal(await webhook(102), 200);
  assert.equal(pagos.get("102")?.estado, "RECHAZADO");
  assert.equal(suscripcion.periodoHasta?.toISOString(), fecha(1));
  proximo = fecha(2);
  await webhook(101);
  assert.equal(suscripcion.periodoHasta?.toISOString(), fecha(1));
  assert.equal(await webhook(103), 200);
  assert.equal(pagos.has("103"), false);
  assert.equal(suscripcion.periodoHasta?.toISOString(), fecha(1));

  estadoSegundaFactura = "approved";
  assert.equal(await webhook(102), 200);
  assert.equal(await webhook(102), 200);
  assert.equal(await webhook(101), 200);
  assert.equal(suscripcion.estado, "ACTIVA");
  assert.equal(suscripcion.periodoHasta?.toISOString(), fecha(2));
  assert.equal(suscripcion.proximoCobroAt?.toISOString(), fecha(2));
  assert.equal(pagos.size, 2);
  assert.equal(pagos.get("102")?.estado, "APROBADO");
  assert.equal(correos.filter(correo => correo.asunto.includes("está confirmada")).length, 2);
  assert.equal(correos.filter(correo => correo.asunto.includes("No pudimos procesar")).length, 1);
  assert.equal(new Set(correos.map(correo => correo.clave)).size, 3);
});
