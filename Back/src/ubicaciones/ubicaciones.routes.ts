import { Router } from "express";
import { paises, provincias, ciudades, artistasCercanos } from "./ubicaciones.controller.js";

export const ubicacionesRouter = Router();
ubicacionesRouter.get("/paises", paises);
ubicacionesRouter.get("/provincias", provincias);
ubicacionesRouter.get("/ciudades", ciudades);
ubicacionesRouter.get("/artistas-cercanos", artistasCercanos);
