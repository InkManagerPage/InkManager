import { Router } from "express";
import { catalogoPublico } from "./catalogo.controller.js";
export const catalogoRouter = Router();
catalogoRouter.get("/", catalogoPublico);
