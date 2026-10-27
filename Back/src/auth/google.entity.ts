import type { PerfilRegistroDto } from "../usuarios/dto/registro-usuario.dto.js";

export interface IdentidadGoogle {
  googleId: string;
  email: string;
  nombre: string;
  registro?: PerfilRegistroDto;
}
