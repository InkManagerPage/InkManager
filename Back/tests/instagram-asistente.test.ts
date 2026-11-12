import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

process.env.JWT_SECRET ??= "solo-pruebas-del-bot-instagram-32-bytes";
const { prisma } = await import("../src/config/prisma.js");
const { configuracionInicial } =
  await import("../src/asistente/configuracion.js");
const { procesarMensajeBot } =
  await import("../src/instagram/instagram-bot.service.js");

function reemplazar(t: TestContext, objeto: object, metodo: string, valor: unknown) {
  const delegado = objeto as Record<string, unknown>;
  const anterior = delegado[metodo];
  delegado[metodo] = valor;
  t.after(() => {
    delegado[metodo] = anterior;
  });
}

test("cada estudio usa su configuración, comparte su formulario y pausa al derivar", async (t) => {
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
  reemplazar(t, prisma.mensajeCanal, "findUnique", async () => null);
  reemplazar(t, prisma.conversacionCanal, "findUnique", async () => hilo);
  reemplazar(t, prisma.conversacionCanal, "findFirst", async () => hilo);
  reemplazar(t, prisma.usuario, "findMany", async () => [
    { nombre: "Ana", nombreArtistico: null, estilosPrincipales: ["Fine Line"] },
  ]);
  reemplazar(
    t,
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
    t,
    prisma,
    "$transaction",
    async (operacion: (tx: object) => Promise<unknown>) =>
      operacion({
        $queryRaw: async () => [],
        conversacionCanal: { findUniqueOrThrow: async () => hilo },
        flujoInstagram: {
          findUnique: async () => hilo.flujoInstagram,
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
      assert.deepEqual(JSON.parse(messages[1].content).artistasActivos, [
        { nombre: "Ana", estilos: ["Fine Line"] },
      ]);
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
  await procesarMensajeBot("hilo", "titular", "m-bot", "BOT", enviar);
  assert.ok(hilo.flujoInstagram?.pausadoAt);
  assert.equal(salidas.length, 4);

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

test("el modelo consulta fechas y duraciones solo de la solicitud vinculada al chat", async (t) => {
  const anterior = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "solo-pruebas";
  t.after(() => {
    if (anterior === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = anterior;
  });

  const hilo = {
    id: "hilo", estudioId: "estudio", solicitudId: "consulta-ig" as string | null,
    estudio: { slug: "estudio-qa", propietarioId: "titular", zonaHoraria: "America/Argentina/Buenos_Aires" },
    canal: "INSTAGRAM", flujoInstagram: null, ultimaEntradaAt: new Date(),
  };
  let vinculoVigente = true;
  let consultasTurnos = 0;
  reemplazar(t, prisma.mensajeCanal, "findUnique", async () => null);
  reemplazar(t, prisma.conversacionCanal, "findUnique", async () => hilo);
  reemplazar(t, prisma.conversacionCanal, "findFirst", async ({ where }) => {
    assert.equal(where.solicitudId, hilo.solicitudId);
    return vinculoVigente ? hilo : null;
  });
  reemplazar(t, prisma.configuracionAsistente, "findUnique", async () => ({ datos: configuracionInicial }));
  reemplazar(t, prisma.usuario, "findMany", async () => []);
  reemplazar(t, prisma.solicitud, "findFirst", async ({ where }) => {
    assert.equal(where.id, "consulta-ig");
    assert.equal(where.estudioId, "estudio");
    assert.deepEqual(where.conversacionesCanal, { some: { id: "hilo" } });
    return {
      id: "consulta-ig", estudioId: "estudio", estado: "ASIGNADA", artistaAsignadoId: "artista",
      cotizaciones: [{ artistaId: "artista", duracionMinutos: 120, validaHasta: null }],
      contacto: { email: "privado@example.test", telefono: "111222333" }, notas: "Nota interna",
    };
  });
  const cita = {
    inicioAt: new Date("2035-02-03T01:30:00Z"), finAt: new Date("2035-02-03T03:00:00Z"),
    estado: "CONFIRMADA", artista: { nombre: "Ana", nombreArtistico: "Ana Tinta" },
  };
  reemplazar(t, prisma.cita, "findMany", async ({ where, select }) => {
    consultasTurnos++;
    assert.equal(where.solicitudId, "consulta-ig");
    assert.deepEqual(where.solicitud, { estudioId: "estudio" });
    assert.deepEqual(Object.keys(select).sort(), ["artista", "estado", "finAt", "inicioAt"]);
    return [cita];
  });
  reemplazar(t, prisma.cita, "findFirst", async ({ where }) => {
    assert.equal(where.solicitudId, "consulta-ig");
    assert.deepEqual(where.estado, { not: "CANCELADA" });
    return { ...cita, inicioAt: new Date("2025-02-03T01:30:00Z"), finAt: new Date("2025-02-03T02:00:00Z"), estado: "COMPLETADA" };
  });
  const modelo = t.mock.method(globalThis, "fetch", async (_url: string, opciones: RequestInit) => {
    const { messages } = JSON.parse(String(opciones.body));
    const { turnosDeEsteChat: turnos, mensaje } = JSON.parse(messages[1].content);
    assert.doesNotMatch(messages[1].content, /privado@example|Nota interna|consulta-ig/);
    let texto = "No encuentro un turno vinculado a este chat.";
    if (hilo.solicitudId) {
      const [turno] = turnos.proximos;
      assert.deepEqual(turno, { fecha: "2035-02-02", dia: "viernes", horaInicio: "22:30",
        fechaFin: "2035-02-03", horaFin: "00:00", duracionMinutos: 90, artista: "Ana Tinta", estado: "CONFIRMADA" });
      assert.equal(turnos.ultimoPasado.estado, "COMPLETADA");
      assert.equal(turnos.duracionEstimadaMinutos, 120);
      texto = mensaje.includes("cuándo")
        ? "Tu turno es el viernes a las " + turno.horaInicio + "."
        : "Reservá " + turno.duracionMinutos + " minutos para la sesión.";
    } else {
      assert.equal(turnos, undefined);
    }
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ accion: "RESPONDER", texto }) } }] });
  });
  const salidas: string[] = [];
  const enviar = async (_hilo: unknown, _clave: string, texto: string) => {
    salidas.push(texto);
    return "ENVIADO" as const;
  };
  await procesarMensajeBot("hilo", "titular", "fecha", "Che, ¿cuándo era mi turno?", enviar);
  await procesarMensajeBot("hilo", "titular", "duracion", "¿Cuánto tiempo me guardo para la sesión?", enviar);
  vinculoVigente = false;
  await procesarMensajeBot("hilo", "titular", "cambio", "¿Cuánto dura mi sesión?", enviar);
  vinculoVigente = true;
  hilo.solicitudId = null;
  await procesarMensajeBot("hilo", "titular", "sin-vinculo", "¿Cuánto dura mi sesión?", enviar);
  assert.equal(consultasTurnos, 3);
  assert.equal(modelo.mock.callCount(), 4);
  assert.deepEqual(salidas, [
    "Tu turno es el viernes a las 22:30.",
    "Reservá 90 minutos para la sesión.",
    "No encuentro un turno vinculado a este chat.",
  ]);
});
