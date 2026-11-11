import assert from "node:assert/strict";
import { test } from "node:test";

process.env.JWT_SECRET ??= "solo-pruebas-del-bot-instagram-32-bytes";
const { prisma } = await import("../src/config/prisma.js");
const { configuracionInicial } =
  await import("../src/asistente/configuracion.js");
const { procesarMensajeBot } =
  await import("../src/instagram/instagram-bot.service.js");

test("cada estudio usa su configuración, comparte su formulario y pausa al derivar", async (t) => {
  function reemplazar(objeto: object, metodo: string, valor: unknown) {
    const delegado = objeto as Record<string, unknown>;
    const anterior = delegado[metodo];
    delegado[metodo] = valor;
    t.after(() => {
      delegado[metodo] = anterior;
    });
  }
  const variables = {
    GROQ_API_KEY: "solo-pruebas",
  };
  for (const [clave, valor] of Object.entries(variables)) {
    const anterior = process.env[clave];
    process.env[clave] = valor;
    t.after(() => {
      if (anterior === undefined) delete process.env[clave];
      else process.env[clave] = anterior;
    });
  }

  const hilo = {
    id: "hilo",
    estudioId: "estudio",
    estudio: { slug: "estudio-qa", propietarioId: "titular" },
    canal: "INSTAGRAM",
    nombre: "Contacto de prueba",
    solicitudId: null,
    flujoInstagram: null as { pausadoAt: Date } | null,
    ultimaEntradaAt: new Date(),
  };
  const configuracion = { ...configuracionInicial, tono: "Informal y breve" };
  const otraConfiguracion = { ...configuracionInicial, tono: "Formal" };
  reemplazar(prisma.mensajeCanal, "findUnique", async () => null);
  reemplazar(prisma.conversacionCanal, "findUnique", async () => hilo);
  reemplazar(prisma.conversacionCanal, "findFirst", async () => hilo);
  reemplazar(
    prisma.configuracionAsistente,
    "findUnique",
    async (params: { where: { estudioId: string } }) => {
      assert.deepEqual(params.where, { estudioId: hilo.estudioId });
      return { datos: params.where.estudioId === "estudio" ? configuracion : otraConfiguracion };
    },
  );
  const avisos: string[] = [];
  let token = "";
  reemplazar(
    prisma,
    "$transaction",
    async (operacion: (tx: object) => Promise<unknown>) =>
      operacion({
        $queryRaw: async () => [],
        conversacionCanal: { findUniqueOrThrow: async () => hilo },
        flujoInstagram: {
          upsert: async ({
            create,
            update,
          }: {
            create: { token: string };
            update: { pausadoAt?: Date };
          }) => {
            if (update.pausadoAt)
              hilo.flujoInstagram = { pausadoAt: update.pausadoAt };
            token = create.token;
            return { token };
          },
        },
        avisoPanel: {
          createMany: async ({ data }: { data: { titulo: string }[] }) => {
            avisos.push(...data.map((aviso) => aviso.titulo));
            return { count: 1 };
          },
        },
      }),
  );

  let accion = "RESPONDER";
  const modelo = t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, opciones: RequestInit) => {
      const { messages } = JSON.parse(String(opciones.body));
      assert.deepEqual(
        JSON.parse(messages[1].content).configuracion,
        hilo.estudioId === "estudio" ? configuracion : otraConfiguracion,
      );
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({ accion, texto: "Dale, te ayudo." }),
            },
          },
        ],
      });
    },
  );
  const salidas: string[] = [];
  const enviar = async (_hilo: unknown, _clave: string, texto: string) => {
    salidas.push(texto);
    return "ENVIADO" as const;
  };

  await procesarMensajeBot(
    "hilo",
    "titular",
    "m1",
    "¿Qué estilos laburan?",
    enviar,
  );
  assert.equal(salidas[0], "Dale, te ayudo.");
  accion = "FORMULARIO";
  await procesarMensajeBot(
    "hilo",
    "titular",
    "m2",
    "¿Cuánto sale tatuarme una flor?",
    enviar,
  );
  assert.ok(salidas[1]?.includes("/cotizacion/estudio-qa?ig=" + token));
  accion = "ESTADO";
  await procesarMensajeBot(
    "hilo",
    "titular",
    "m3",
    "¿Les llegó lo que completé?",
    enviar,
  );
  assert.match(salidas[2] ?? "", /No encontré una consulta activa/);
  accion = "DERIVAR";
  await procesarMensajeBot(
    "hilo",
    "titular",
    "m4",
    "¿Puedo hablar con alguien?",
    enviar,
  );
  assert.match(salidas[3] ?? "", /Una persona/);
  assert.deepEqual(avisos, ["Un cliente pide hablar con el estudio"]);
  await procesarMensajeBot(
    "hilo",
    "titular",
    "m5",
    "Hola, ¿siguen ahí?",
    enviar,
  );
  assert.equal(salidas.length, 4);
  assert.equal(modelo.mock.callCount(), 4);

  hilo.flujoInstagram = null;
  hilo.estudioId = "estudio-2";
  hilo.estudio = { slug: "otro-estudio", propietarioId: "otro-titular" };
  accion = "FORMULARIO";
  await procesarMensajeBot("hilo", "titular", "m6", "¿Cuánto cuesta?", enviar);
  assert.equal(modelo.mock.callCount(), 4);
  await procesarMensajeBot("hilo", "otro-titular", "m7", "¿Cuánto cuesta?", enviar);
  assert.equal(modelo.mock.callCount(), 5);
  assert.ok(salidas[4]?.includes("/cotizacion/otro-estudio?ig=" + token));
});
