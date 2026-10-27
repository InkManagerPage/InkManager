import { Router } from "express";
import { listarEstilos } from "./estilos.controller.js";
export const estilosRouter = Router();
estilosRouter.get("/", listarEstilos);
