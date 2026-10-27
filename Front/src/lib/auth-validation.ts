import type { FormikErrors } from 'formik';
import type { LoginValues, RegisterValues } from '@/types/forms';

export const requisitosPassword =
  'Usá al menos 9 caracteres, una mayúscula, un número y un símbolo.';

export function errorPassword(password: string): string | undefined {
  if (!/^(?=.*\p{Lu})(?=.*[0-9])(?=.*[\p{P}\p{S}]).{9,}$/su.test(password))
    return requisitosPassword;
  if (new TextEncoder().encode(password).length > 72)
    return 'La contraseña no puede superar los 72 bytes.';
}

export function validarLogin(values: LoginValues): FormikErrors<LoginValues> {
  const errors: FormikErrors<LoginValues> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.trim().length > 254)
    errors.email = 'Ingresá un email válido.';
  if (!values.password) errors.password = 'Ingresá tu contraseña.';
  else if (new TextEncoder().encode(values.password).length > 72)
    errors.password = 'La contraseña no puede superar los 72 bytes.';
  return errors;
}

export function validarNuevaPassword(values: { password: string; confirmPassword: string }) {
  const errors: { password?: string; confirmPassword?: string } = {};
  const error = errorPassword(values.password);
  if (error) errors.password = error;
  if (!values.confirmPassword || values.confirmPassword !== values.password)
    errors.confirmPassword = 'Las contraseñas deben coincidir.';
  return errors;
}

export function validarRegistro(values: RegisterValues): FormikErrors<RegisterValues> {
  const errors: FormikErrors<RegisterValues> = {
    ...validarLogin(values),
    ...validarNuevaPassword(values),
  };
  const nombre = values.nombre.trim().normalize('NFC').replace(/ +/g, ' ');
  if (nombre.length < 2 || nombre.length > 20 || !/^\p{L}+(?: \p{L}+)*$/u.test(nombre))
    errors.nombre = 'Usá entre 2 y 20 caracteres, solo letras y espacios.';
  const nombrePublicoValido = (valor: string) =>
    valor.trim().length >= 2 && valor.trim().length <= 50;
  if (values.rol === 'ARTISTA' && !nombrePublicoValido(values.nombreArtistico))
    errors.nombreArtistico = 'Ingresá un nombre artístico de 2 a 50 caracteres.';
  if (values.rol === 'ESTUDIO_ADMIN' && !nombrePublicoValido(values.nombreEstudio))
    errors.nombreEstudio = 'Ingresá un nombre de estudio de 2 a 50 caracteres.';
  return errors;
}
