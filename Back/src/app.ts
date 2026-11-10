import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./auth/auth.routes.js";
import usuariosRoutes from "./usuarios/usuarios.routes.js";
import { healthRouter } from "./health/health.routes.js";
import { imagenRouter } from "./imagenes/imagenes.routes.js";
import { resenasRouter } from "./resenas/resenas.routes.js";
import { origenesPermitidos } from "./config/auth.js";
import { manejarErrores } from "./middlewares/errores.js";
import { validarOrigen } from "./middlewares/origen.js";
import { tokensCuentaRouter } from "./tokens-cuenta/tokens-cuenta.routes.js";
import { artistasRouter } from "./artistas/artistas.routes.js";
import { trabajosRouter } from "./trabajos/trabajos.routes.js";
import { estilosRouter } from "./estilos/estilos.routes.js";
import { catalogoRouter } from "./catalogo/catalogo.routes.js";
import { ubicacionesRouter } from "./ubicaciones/ubicaciones.routes.js";
import { solicitudesRouter } from "./solicitudes/solicitudes.routes.js";
import { citasRouter } from "./citas/citas.routes.js";
import { equipoRouter } from "./equipo/equipo.routes.js";
import { invitacionesEquipoRouter } from "./invitaciones-equipo/invitaciones-equipo.routes.js";
import { disponibilidadRouter } from "./disponibilidad/disponibilidad.routes.js";
import { pagosRouter } from "./pagos/pagos.routes.js";
import { webhooksMercadoPagoRouter } from "./webhooks/mercadopago.routes.js";
import { administracionRouter } from "./administracion/administracion.routes.js";
import { webhookWhatsApp } from "./whatsapp/whatsapp.routes.js";
import { webhookInstagram } from "./instagram/instagram.routes.js";
import { mensajesUnificadosRouter } from "./mensajes/mensajes.routes.js";
import { operacionRouter } from "./operacion/operacion.routes.js";

export const app = express();

app.use(cors({ origin: origenesPermitidos, credentials: true }));
app.use(validarOrigen);
app.use("/api/webhooks/whatsapp", webhookWhatsApp);
app.use("/api/webhooks/instagram", webhookInstagram);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/auth", tokensCuentaRouter);
app.use("/api/auth", usuariosRoutes);
app.use("/api/health", healthRouter);
app.use("/api/upload", imagenRouter);
app.use("/api/resenas", resenasRouter);
app.use("/api/artistas", artistasRouter);
app.use("/api/trabajos", trabajosRouter);
app.use("/api/estilos", estilosRouter);
app.use("/api/catalogo", catalogoRouter);
app.use("/api/ubicaciones", ubicacionesRouter);
app.use("/api/consultas", solicitudesRouter);
app.use("/api/citas", citasRouter);
app.use("/api/equipo", equipoRouter);
app.use("/api/invitaciones-equipo", invitacionesEquipoRouter);
app.use("/api/disponibilidad", disponibilidadRouter);

app.use("/api/pagos", pagosRouter);
app.use("/api/webhooks", webhooksMercadoPagoRouter);
app.use("/api/admin", administracionRouter);
app.use("/api/mensajes", mensajesUnificadosRouter);
app.use("/api/operacion", operacionRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "La ruta solicitada no existe." });
});
app.use(manejarErrores);
