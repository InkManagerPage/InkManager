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

export const app = express();

app.use(cors({ origin: origenesPermitidos, credentials: true }));
app.use(validarOrigen);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/auth", tokensCuentaRouter);
app.use("/api/auth", usuariosRoutes);
app.use("/api/health", healthRouter);
app.use("/api/upload", imagenRouter);
app.use("/api/resenas", resenasRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "La ruta solicitada no existe." });
});
app.use(manejarErrores);
