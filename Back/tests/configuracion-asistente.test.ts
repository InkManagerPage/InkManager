import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import {
  configuracionInicial,
  validarConfiguracion,
} from "../src/asistente/configuracion.js";
import { generarRespuestaAsistente } from "../src/asistente/respuesta.js";

test("el asistente acepta un archivo exportable y normaliza los textos", () => {
  const datos = {
    ...configuracionInicial,
    tono: "  Cercano y breve.  ",
    servicios: ["  Tatuajes personalizados  "],
    preguntasFrecuentes: [
      { pregunta: "¿Necesito seña?", respuesta: "  Sí.  " },
    ],
  };
  assert.deepEqual(validarConfiguracion(JSON.parse(JSON.stringify(datos))), {
    ...configuracionInicial,
    tono: "Cercano y breve.",
    servicios: ["Tatuajes personalizados"],
    preguntasFrecuentes: [{ pregunta: "¿Necesito seña?", respuesta: "Sí." }],
  });
});

test("el asistente rechaza versiones, campos y listas fuera del formato", () => {
  for (const datos of [
    null,
    { ...configuracionInicial, version: 2 },
    { ...configuracionInicial, tono: " " },
    { ...configuracionInicial, idEstudio: "otro-estudio" },
    { ...configuracionInicial, servicios: Array(16).fill("Tatuajes") },
    {
      ...configuracionInicial,
      preguntasFrecuentes: [{ pregunta: "¿Cuándo?" }],
    },
  ]) {
    assert.throws(() => validarConfiguracion(datos), { status: 400 });
  }
});

function usarClave(t: TestContext, clave: string) {
  const anterior = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = clave;
  t.after(() => {
    if (anterior === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = anterior;
  });
}

function respuestaGroq(resultado: object, fin = "stop") {
  return Response.json({
    choices: [
      {
        finish_reason: fin,
        message: { content: JSON.stringify(resultado) },
      },
    ],
  });
}

test("la respuesta usa el archivo del negocio y una acción permitida", async (t) => {
  usarClave(t, "solo-pruebas");
  const configuracion = { ...configuracionInicial, servicios: ["Línea fina"] };
  const mensaje = "Tengo un dibujo en mente, ¿cómo averiguo cuánto me saldría?";
  const respuesta = {
    accion: "FORMULARIO",
    texto: "Contanos tu idea en el formulario.",
  };
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async (url: string, opciones: RequestInit) => {
      assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
      assert.equal(
        new Headers(opciones.headers).get("Authorization"),
        "Bearer solo-pruebas",
      );
      const payload = JSON.parse(String(opciones.body));
      assert.equal(payload.messages[1].role, "user");
      assert.deepEqual(JSON.parse(payload.messages[1].content), {
        configuracion,
        mensaje,
      });
      assert.equal(payload.response_format.json_schema.strict, true);
      return respuestaGroq(respuesta);
    },
  );
  assert.deepEqual(
    await generarRespuestaAsistente(configuracion, mensaje),
    respuesta,
  );
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("el asistente controla respuestas inválidas y errores del proveedor", async (t) => {
  usarClave(t, "solo-pruebas");
  const respuestas = [
    respuestaGroq({ accion: "PAGAR", texto: "Inválido" }),
    respuestaGroq({ accion: "RESPONDER", texto: " " }),
    respuestaGroq({ accion: "RESPONDER", texto: "Hola" }, "length"),
    Response.json({ error: "interno" }, { status: 401 }),
    Response.json({ error: "rate limit" }, { status: 429 }),
  ];
  t.mock.method(globalThis, "fetch", async () => respuestas.shift());
  for (const status of [502, 502, 502, 502, 429])
    await assert.rejects(
      generarRespuestaAsistente(configuracionInicial, "Hola"),
      { status },
    );
});

test("la prueba informa cuando falta la clave de Groq", async (t) => {
  usarClave(t, "");
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("La prueba no debe consultar el proveedor.");
  });
  await assert.rejects(
    generarRespuestaAsistente(configuracionInicial, "Hola"),
    { status: 503 },
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});
