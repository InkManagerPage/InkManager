export type RolUsuario = 'CLIENTE' | 'ARTISTA' | 'ESTUDIO_ADMIN' | 'SUPERADMIN';

export interface UsuarioSesion {
  id: string;
  nombre: string | null;
  email: string;
  rol: RolUsuario;
  estudioId: string | null;
}

export interface RespuestaLogin {
  message: string;
  user: UsuarioSesion;
}
