import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { HttpError } from "../errors/http-error.js";

export const manejarErrores: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof MulterError) {
    const grande = error.code === "LIMIT_FILE_SIZE";
    res.status(grande ? 413 : 400).json({
      error: grande
        ? "La imagen debe pesar como máximo 2 MB."
        : "Enviá una sola imagen en el campo «imagen».",
    });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error) {
    if (error.type === "entity.parse.failed") {
      res
        .status(400)
        .json({ error: "El cuerpo de la solicitud debe ser un JSON válido." });
      return;
    }
    if (error.type === "entity.too.large") {
      res
        .status(413)
        .json({ error: "La solicitud supera el tamaño permitido." });
      return;
    }
  }

  console.error("Error inesperado al procesar la solicitud.");
  res
    .status(500)
    .json({ error: "No pudimos completar la solicitud. Intentá nuevamente." });
};
