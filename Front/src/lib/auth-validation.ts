import type { FormikErrors } from 'formik';
import type { LoginValues, RegisterValues } from '@/types/forms';
export function validarLogin(values: LoginValues): FormikErrors<LoginValues> {
  const errors: FormikErrors<LoginValues> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.trim().length > 254)
    errors.email = 'Ingresá un email válido.';
  if (!values.password) errors.password = 'Ingresá tu contraseña.';
  return errors;
}
export function validarRegistro(values: RegisterValues): FormikErrors<RegisterValues> {
  const errors: FormikErrors<RegisterValues> = validarLogin(values);
  const nombreValido = (value: string) => value.trim().length >= 2 && value.trim().length <= 50;
  if (!nombreValido(values.nombre)) errors.nombre = 'Usá entre 2 y 50 caracteres.';
  if (values.password.length < 15 || !values.password.trim())
    errors.password = 'Usá una frase de al menos 15 caracteres.';
  else if (new TextEncoder().encode(values.password).length > 72)
    errors.password = 'Tu contraseña es demasiado larga. Usá una frase más corta.';
  if (values.confirmPassword !== values.password || !values.confirmPassword)
    errors.confirmPassword = 'Las contraseñas deben coincidir.';
  if (values.rol === 'ARTISTA' && !nombreValido(values.nombreArtistico))
    errors.nombreArtistico = 'Ingresá un nombre artístico de 2 a 50 caracteres.';
  if (values.rol === 'ESTUDIO_ADMIN' && !nombreValido(values.nombreEstudio))
    errors.nombreEstudio = 'Ingresá un nombre de estudio de 2 a 50 caracteres.';
  return errors;
}
