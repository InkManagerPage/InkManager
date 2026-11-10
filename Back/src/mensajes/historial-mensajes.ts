import { HttpError } from "../errors/http-error.js";

export const tamanoPaginaMensajes = 60;

export const camposMensaje = {
  id: true,
  texto: true,
  propio: true,
  fecha: true,
  estado: true,
} as const;

export const ordenMensajes = [{ fecha: "desc" as const }, { id: "desc" as const }];

export function anterioresA(cursor: { fecha: Date; id: string } | null) {
  if (!cursor) throw new HttpError(404, "No encontramos el historial de la conversación.");
  return {
    OR: [
      { fecha: { lt: cursor.fecha } },
      { fecha: cursor.fecha, id: { lt: cursor.id } },
    ],
  };
}

export function presentarMensajes<T extends { id: string; fecha: Date; estado: string }>(
  filas: T[], cantidad: number,
) {
  const mensajes = filas.slice(0, cantidad).reverse().map((m) => ({
    ...m,
    estado: m.estado === "ENVIANDO" && Date.now() - m.fecha.getTime() > 90000
      ? ("INCIERTO" as const)
      : m.estado,
  }));
  return {
    mensajes,
    anterior: filas.length > cantidad ? mensajes[0]?.id ?? null : null,
  };
}
