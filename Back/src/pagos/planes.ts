import type { CicloSuscripcion, PlanSuscripcion } from "@prisma/client";
import { HttpError } from "../errors/http-error.js";

type FrecuenciaPlan = "MENSUAL" | "ANUAL";

type Plan = {
  id: PlanSuscripcion;
  nombre: string;
  mensual: number;
  anual: number;
  moneda: "ARS";
};

function precioConfigurado(variable: string, valorInicial: number): number {
  const configurado = process.env[variable];
  if (configurado === undefined || configurado.trim() === "") return valorInicial;
  const monto = Number(configurado);
  if (
    !Number.isFinite(monto) ||
    monto <= 0 ||
    monto > 1_000_000_000 ||
    !/^\d+(?:\.\d{1,2})?$/.test(configurado)
  ) {
    throw new HttpError(503, `La configuración ${variable} no es válida.`);
  }
  return monto;
}

export function obtenerPlanes(): Plan[] {
  return [
    {
      id: "INDIVIDUAL",
      nombre: "Individual",
      mensual: precioConfigurado("MP_PLAN_INDIVIDUAL_MENSUAL_ARS", 12000),
      anual: precioConfigurado("MP_PLAN_INDIVIDUAL_ANUAL_ARS", 120000),
      moneda: "ARS",
    },
    {
      id: "ESTUDIO",
      nombre: "Estudio",
      mensual: precioConfigurado("MP_PLAN_ESTUDIO_MENSUAL_ARS", 35000),
      anual: precioConfigurado("MP_PLAN_ESTUDIO_ANUAL_ARS", 350000),
      moneda: "ARS",
    },
  ];
}

export function obtenerPrecio(
  plan: PlanSuscripcion,
  ciclo: CicloSuscripcion,
): number {
  const seleccionado = obtenerPlanes().find((item) => item.id === plan);
  if (!seleccionado) throw new HttpError(400, "Elegí un plan válido.");
  return ciclo === "ANUAL" ? seleccionado.anual : seleccionado.mensual;
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
    Object.keys(datos).some(
      (campo) =>
        ![
          "plan",
          "ciclo",
          "card_token_id",
          "payment_method_id",
          "identification_number",
        ].includes(campo),
    ) ||
    (datos.plan !== "INDIVIDUAL" && datos.plan !== "ESTUDIO") ||
    (datos.ciclo !== "MENSUAL" && datos.ciclo !== "ANUAL")
  ) {
    throw new HttpError(
      400,
      "Elegí un plan y un ciclo de facturación válidos.",
    );
  }

  if (
    datos.card_token_id !== undefined &&
    (typeof datos.card_token_id !== "string" ||
      datos.card_token_id.length < 8 ||
      datos.card_token_id.length > 512 ||
      datos.card_token_id.trim() !== datos.card_token_id)
  ) {
    throw new HttpError(400, "El token de tarjeta no es válido.");
  }
  if (
    datos.payment_method_id !== undefined &&
    (typeof datos.payment_method_id !== "string" ||
      !/^[a-zA-Z0-9_-]{2,40}$/.test(datos.payment_method_id))
  ) {
    throw new HttpError(400, "El medio de pago no es válido.");
  }
  if (
    datos.identification_number !== undefined &&
    (typeof datos.identification_number !== "string" ||
      !/^\d{7,11}$/.test(datos.identification_number))
  ) {
    throw new HttpError(400, "El documento del titular no es válido.");
  }
  if (
    datos.ciclo === "ANUAL" &&
    datos.card_token_id !== undefined &&
    (datos.payment_method_id === undefined ||
      datos.identification_number === undefined)
  ) {
    throw new HttpError(
      400,
      "El pago anual con tarjeta requiere el medio de pago y DNI del titular.",
    );
  }

  return { plan: datos.plan, ciclo: datos.ciclo };
}

export type CicloPlan = FrecuenciaPlan;
