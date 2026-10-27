import { Router } from "express";
import { paises, provincias, ciudades } from "./ubicaciones.controller.js";

export const ubicacionesRouter = Router();
ubicacionesRouter.get("/paises", paises);
ubicacionesRouter.get("/provincias", provincias);
ubicacionesRouter.get("/ciudades", ciudades);
