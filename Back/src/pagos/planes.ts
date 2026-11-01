import type { CicloSuscripcion, PlanSuscripcion } from "@prisma/client";
import { HttpError } from "../errors/http-error.js";

const preciosMensuales: Record<PlanSuscripcion, number> = {
  INDIVIDUAL: 12000,
  ESTUDIO: 35000,
};

export function obtenerPrecio(
  plan: PlanSuscripcion,
  ciclo: CicloSuscripcion,
): number {
  const mensual = preciosMensuales[plan];
  return ciclo === "ANUAL" ? mensual * 10 : mensual;
}

export function validarPlanYCiclo(entrada: unknown): {
  plan: PlanSuscripcion;
  ciclo: CicloSuscripcion;
} {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw new HttpError(
      400,
      "Elegí un plan y un ciclo de facturación válidos.",
    );
  }

  const datos = entrada as Record<string, unknown>;
  if (
    (datos.plan !== "INDIVIDUAL" && datos.plan !== "ESTUDIO") ||
    (datos.ciclo !== "MENSUAL" && datos.ciclo !== "ANUAL")
  ) {
    throw new HttpError(
      400,
      "Elegí un plan y un ciclo de facturación válidos.",
    );
  }

  return { plan: datos.plan, ciclo: datos.ciclo };
}
