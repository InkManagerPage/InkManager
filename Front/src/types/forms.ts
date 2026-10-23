import type { RolUsuario } from './auth';
export interface AuthModalProps {
  show: boolean;
  onHide: () => void;
  onSwitch: () => void;
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
