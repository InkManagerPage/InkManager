import { HttpError } from "../errors/http-error.js";
import {
  objetoEntrada,
  validarVersion,
} from "../solicitudes/solicitudes.validation.js";
import type { DatosCotizacion } from "./cotizaciones.entity.js";

function importe(valor: unknown) {
  const texto =
    typeof valor === "number"
      ? String(valor)
      : typeof valor === "string"
        ? valor
        : "";
  if (!/^\d+(\.\d{1,2})?$/.test(texto))
    throw new HttpError(
      400,
      "Los importes deben ser números con hasta dos decimales.",
    );
  return Number(texto);
}
export function validarCotizacion(
  entrada: unknown,
  ahora = new Date(),
): DatosCotizacion {
  const body = objetoEntrada(entrada);
  const total = importe(body.importe),
    sena = importe(body.sena);
  if (total <= 0 || total > 100000000 || sena > total)
    throw new HttpError(400, "Revisá el importe y la seña.");
  if (
    typeof body.detalle !== "string" ||
    body.detalle.trim().length < 10 ||
    body.detalle.trim().length > 1200
  )
    throw new HttpError(
      400,
      "El detalle debe tener entre 10 y 1200 caracteres.",
    );
  const fecha = typeof body.validez === "string" ? body.validez : "";
  const validez = new Date(`${fecha}T23:59:59.999Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !Number.isFinite(validez.getTime()) ||
    validez.toISOString().slice(0, 10) !== fecha ||
    validez < ahora
  )
    throw new HttpError(400, "Elegí una fecha de validez desde hoy.");
  const version = validarVersion({
    ...body,
    version:
      typeof body.version === "string" && /^\d+$/.test(body.version)
        ? Number(body.version)
        : body.version,
  });
  return {
    importe: total,
    sena,
    detalle: body.detalle.trim(),
    validez,
    version,
  };
}
