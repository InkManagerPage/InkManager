import type { Request, Response, NextFunction } from "express";
import type { Rol } from "../types/roles.js";

export function requerirRoles(...rolesPermitidos: Rol[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = req.usuario;

    if (!usuario) {
      res.status(401).json({ error: "Debés iniciar sesión." });
      return;
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
      res.status(403).json({
        error: "No tenés permisos para realizar esta acción.",
      });
      return;
    }

    next();
  };
}
