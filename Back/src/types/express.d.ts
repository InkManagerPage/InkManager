import type { UsuarioSesion } from "../usuarios/usuarios.entity.js";

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioSesion;
    }
  }
}
