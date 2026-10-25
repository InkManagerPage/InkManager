import type { RolUsuario } from './auth';
export type ContextoRegistro = 'cliente' | 'profesional' | 'general';
export type PublicoRegistro = Exclude<ContextoRegistro, 'general'>;
export interface AuthModalProps {
  show: boolean;
  onHide: () => void;
  onSwitch: () => void;
}
export interface RegisterModalProps extends AuthModalProps {
  contexto: ContextoRegistro;
}
export interface LoginValues {
  email: string;
  password: string;
}
export interface RegisterValues extends LoginValues {
  nombre: string;
  confirmPassword: string;
  rol: Exclude<RolUsuario, 'SUPERADMIN'>;
  nombreArtistico: string;
  nombreEstudio: string;
}
