import { Router } from "express";
import { recibirWebhookMercadoPago } from "../pagos/pagos.controller.js";

export const webhooksMercadoPagoRouter = Router();
webhooksMercadoPagoRouter.post("/mercadopago", recibirWebhookMercadoPago);
