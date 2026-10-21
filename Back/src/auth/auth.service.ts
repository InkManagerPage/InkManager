import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { HttpError } from "../errors/http-error.js";
import { buscarUsuarioParaLogin } from "../usuarios/usuarios.repository.js";
import { validarLogin } from "./auth.validation.js";
import { crearToken } from "./auth.tokens.js";

const hashAlternativo = bcrypt.hashSync(crypto.randomUUID(), 12);

export async function validarCredenciales(entrada: unknown) {
  const datos = validarLogin(entrada);
  const usuario = await buscarUsuarioParaLogin(datos.email);

  const passwordCorrecta = await bcrypt.compare(
    datos.password,
    usuario?.password ?? hashAlternativo,
  );

  if (!usuario || !passwordCorrecta) {
    throw new HttpError(401, "Email o contraseña incorrectos.");
  }

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    estudioId: usuario.estudioId,
  };
}

export async function iniciarSesion(entrada: unknown) {
  const usuario = await validarCredenciales(entrada);
  const token = crearToken(usuario.id);
  return { usuario, token };
}
