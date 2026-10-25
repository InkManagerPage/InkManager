// Importa ROL
import { Rol } from "../../types/roles.js";

export type PerfilRegistroDto =
  | { rol: typeof Rol.CLIENTE }
  | { rol: typeof Rol.ARTISTA; nombreArtistico: string }
  | { rol: typeof Rol.ESTUDIO_ADMIN; nombreEstudio: string };

// Interface describe los datos que espera recibir nuestro código
export interface RegistroUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  // rol admite los 3 roles del registro público
  rol: typeof Rol.CLIENTE | typeof Rol.ARTISTA | typeof Rol.ESTUDIO_ADMIN;
  nombreArtistico?: string;
  nombreEstudio?: string;
}
