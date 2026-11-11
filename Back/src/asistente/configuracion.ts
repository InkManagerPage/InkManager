import { HttpError } from "../errors/http-error.js";

export const configuracionInicial = {
  version: 1,
  tono: "Cercano y profesional, en español rioplatense.",
  servicios: [] as string[],
  politicas: { senas: "", cancelaciones: "" },
  preguntasFrecuentes: [] as { pregunta: string; respuesta: string }[],
  derivacion:
    "Derivá cuando el cliente pida hablar con el equipo o falten datos para responder.",
};

function campos(valor: unknown, esperados: string[], nombre: string) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor))
    throw new HttpError(400, `${nombre} debe ser un objeto JSON.`);
  const objeto = valor as Record<string, unknown>;
  if (
    Object.keys(objeto).length !== esperados.length ||
    !esperados.every((campo) => Object.hasOwn(objeto, campo))
  )
    throw new HttpError(
      400,
      `${nombre} debe contener estos campos: ${esperados.join(", ")}.`,
    );
  return objeto;
}

function texto(
  valor: unknown,
  maximo: number,
  nombre: string,
  obligatorio = false,
) {
  if (
    typeof valor !== "string" ||
    valor.length > maximo ||
    (obligatorio && !valor.trim())
  )
    throw new HttpError(
      400,
      `${nombre} debe ser texto de ${obligatorio ? "1 a " : "hasta "}${maximo} caracteres.`,
    );
  return valor.trim();
}

function lista(valor: unknown, maximo: number, nombre: string): unknown[] {
  if (!Array.isArray(valor) || valor.length > maximo)
    throw new HttpError(
      400,
      `${nombre} debe ser una lista de hasta ${maximo} elementos.`,
    );
  return valor;
}

export function validarConfiguracion(valor: unknown) {
  const datos = campos(
    valor,
    Object.keys(configuracionInicial),
    "La configuración",
  );
  if (datos.version !== 1)
    throw new HttpError(400, "El archivo debe usar la versión 1.");
  const politicas = campos(
    datos.politicas,
    ["senas", "cancelaciones"],
    "Las políticas",
  );
  return {
    version: 1,
    tono: texto(datos.tono, 500, "El tono", true),
    servicios: lista(datos.servicios, 15, "Los servicios").map((s) =>
      texto(s, 180, "Cada servicio", true),
    ),
    politicas: {
      senas: texto(politicas.senas, 1000, "La política de señas"),
      cancelaciones: texto(
        politicas.cancelaciones,
        1000,
        "La política de cancelaciones",
      ),
    },
    preguntasFrecuentes: lista(
      datos.preguntasFrecuentes,
      20,
      "Las preguntas frecuentes",
    ).map((valor) => {
      const item = campos(
        valor,
        ["pregunta", "respuesta"],
        "Cada pregunta frecuente",
      );
      return {
        pregunta: texto(item.pregunta, 250, "La pregunta", true),
        respuesta: texto(item.respuesta, 1000, "La respuesta", true),
      };
    }),
    derivacion: texto(datos.derivacion, 1000, "La regla de derivación", true),
  };
}
