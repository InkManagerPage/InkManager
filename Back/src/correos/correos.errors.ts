import { HttpError } from "../errors/http-error.js";

export class ErrorCorreo extends Error {}

export function registrarErrorCorreo(contexto: string, error: unknown): void {
  const detalle =
    error instanceof ErrorCorreo || error instanceof HttpError
      ? error.message
      : "No se pudo preparar el correo. Revisá la conexión y la tabla TokenCuenta.";
  // Solo imprimimos mensajes propios; la respuesta del proveedor puede contener emails.
  console.error(`${contexto} ${detalle}`);
}
