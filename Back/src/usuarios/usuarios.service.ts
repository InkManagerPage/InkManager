import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { HttpError } from "../errors/http-error.js";
import {
  buscarUsuarioPorEmail,
  buscarUsuarioPorToken,
  crearUsuario,
  marcarEmailVerificado,
  filtrarArtista
} from "./usuarios.repository.js";
import {
  validarRegistroUsuario,
  validarRegistroArtista,
} from "./usuarios.validation.js";
import { Rol } from "../types/roles.js";
import { Prisma } from "@prisma/client";

export async function registrarArtista(entrada: unknown) {
  const datos = validarRegistroArtista(entrada);
  const {
    // Datos obligatorios
    email,
    password,
    nombre,
    nombreArtistico,

    // Datos personales
    alias,
    telefono,
    dniPasaporte,

    // Ubicación
    tipoTrabajo,
    direccion,
    ciudad,
    pais,
    radioAlcanceKm,
    horariosAtencion,

    // Perfil y portafolio
    estilosPrincipales,
    instagram,
    tiktok,
    sitioWeb,
    anosExperiencia,
    galeria,

    // Tarifas
    tarifaMinima,
    modalidadCobro,
    requiereSena,
    montoPorcentajeSena,
    politicaCancelacion,
    metodosPagoAceptados,
    cbuAliasBancario,

    // Documentación y preferencias
    numeroLicencia,
    licenciaSanitariaUrl,
    documentoIdentidadUrl,
    fotoPerfil,
    fotoTrabajando,
    aceptaDeclaracionHigiene,
    aceptaCoverUp,
    aceptaCicatrices,
    aceptaRetoques,
    aceptaCaraManos,
    copiaDisenosInternet,
    tamanoMinimoCm,
  } = datos;

  const existingUser = await buscarUsuarioPorEmail(email);
  if (existingUser) {
    throw new HttpError(409, "El correo electrónico ya está registrado.");
  }

  // Adjuntar un documento o una licencia deja la verificación pendiente.
  const estadoVerificacion =
    documentoIdentidadUrl || licenciaSanitariaUrl
      ? "PENDIENTE"
      : "NO_VERIFICADO";

  const hashedPassword = await bcrypt.hash(password, 12);

  const tokenVerificacionEmail = crypto.randomBytes(32).toString("hex");

  try {
    return await crearUsuario({
      // Datos Obligatorios
      email,
      password: hashedPassword,
      nombre,
      nombreArtistico,
      rol: "ARTISTA",
      tokenVerificacionEmail,
      emailVerificado: false,
      estadoVerificacion,

      // Datos Personales Opcionales
      alias: alias || nombreArtistico.toLowerCase().replace(/\s+/g, "_"),
      telefono: telefono || null,
      dniPasaporte: dniPasaporte || null,
      documentoIdentidadUrl: documentoIdentidadUrl || null,
      fotoPerfil: fotoPerfil || null,
      fotoTrabajando: fotoTrabajando || null,

      // Ubicación
      tipoTrabajo: tipoTrabajo || null,
      direccion: direccion || null,
      ciudad: ciudad || null,
      pais: pais || null,
      radioAlcanceKm:
        radioAlcanceKm !== undefined ? Number(radioAlcanceKm) : 20,
      horariosAtencion: horariosAtencion || undefined,

      // Perfil Artístico
      estilosPrincipales: Array.isArray(estilosPrincipales)
        ? estilosPrincipales
        : [],
      instagram: instagram || null,
      tiktok: tiktok || null,
      sitioWeb: sitioWeb || null,
      anosExperiencia:
        anosExperiencia !== undefined ? Number(anosExperiencia) : null,

      // Tarifas y Reglas Económicas
      tarifaMinima: tarifaMinima !== undefined ? Number(tarifaMinima) : null,
      modalidadCobro: modalidadCobro || null,
      requiereSena: requiereSena ?? true,
      montoPorcentajeSena:
        montoPorcentajeSena !== undefined ? Number(montoPorcentajeSena) : null,
      politicaCancelacion: politicaCancelacion || null,
      metodosPagoAceptados: Array.isArray(metodosPagoAceptados)
        ? metodosPagoAceptados
        : [],
      cbuAliasBancario: cbuAliasBancario || null,

      // Higiene y Licencias
      numeroLicencia: numeroLicencia || null,
      licenciaSanitariaUrl: licenciaSanitariaUrl || null,
      aceptaDeclaracionHigiene: aceptaDeclaracionHigiene ?? false,

      // Preferencias de Proyecto
      aceptaCoverUp: aceptaCoverUp ?? true,
      aceptaCicatrices: aceptaCicatrices ?? true,
      aceptaRetoques: aceptaRetoques ?? true,
      aceptaCaraManos: aceptaCaraManos ?? false,
      copiaDisenosInternet: copiaDisenosInternet ?? false,
      tamanoMinimoCm: tamanoMinimoCm !== undefined ? Number(tamanoMinimoCm) : 5,

      // Galería (si la envía durante el onboarding)
      galeria:
        Array.isArray(galeria) && galeria.length > 0
          ? {
              create: galeria.map(
                (foto: { url: string; esCicatrizado?: boolean }) => ({
                  url: foto.url,
                  esCicatrizado: foto.esCicatrizado || false,
                }),
              ),
            }
          : undefined,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "El correo electrónico ya está registrado.");
    }
    throw error;
  }
}

export async function verificarEmail(token: unknown) {
  if (!token || typeof token !== "string") {
    throw new HttpError(
      400,
      "Token de verificación no proporcionado o inválido.",
    );
  }

  const usuario = await buscarUsuarioPorToken(token);
  if (!usuario) {
    throw new HttpError(404, "Token de verificación inválido o expirado.");
  }

  await marcarEmailVerificado(usuario.id);
}

// Paso 1: Validar los datos de entrada y verificar si el correo electrónico ya está registrado
// Paso 2: Si el correo electrónico no está registrado, hashear la contraseña y generar un token de verificación de correo electrónico
// Paso 3: Crear el usuario en la base de datos y, si es un estudio, crear también el estudio asociado
// Paso 4: Manejar errores de la base de datos, como violaciones de unicidad, y lanzar errores HTTP apropiados
// Paso 5: Retornar el usuario creado o lanzar un error si ocurre algún problema durante el proceso
export async function registrarUsuario(entrada: unknown) {
  const datos = validarRegistroUsuario(entrada);
  const existente = await buscarUsuarioPorEmail(datos.email);

  if (existente) {
    throw new HttpError(409, "El correo electrónico ya está registrado.");
  }

  const passwordHash = await bcrypt.hash(datos.password, 12);
  const tokenVerificacionEmail = crypto.randomBytes(32).toString("hex");

  const estudio =
    datos.rol === Rol.ESTUDIO_ADMIN && datos.nombreEstudio
      ? {
          nombre: datos.nombreEstudio,
          slug: "estudio-" + crypto.randomUUID(),
        }
      : undefined;

  try {
    return await crearUsuario(
      {
        nombre: datos.nombre,
        email: datos.email,
        password: passwordHash,
        rol: datos.rol,
        nombreArtistico: datos.nombreArtistico || null,
        estilosPrincipales: [],
        metodosPagoAceptados: [],
        emailVerificado: false,
        tokenVerificacionEmail,
      },
      estudio,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "Ya existe un registro con esos datos");
    }
    throw error;
  }
}

export async function obtenerArtistasFiltrados(query: { estilos?: string | string[]; ciudad?: string; alcance?: string }) {
  const filtrosListos = {
    estilos: query.estilos ? (Array.isArray(query.estilos) ? query.estilos : [query.estilos]) : undefined,
    ciudad: query.ciudad,
    alcance: query.alcance ? Number(query.alcance) : undefined,
  };
  
  try {
    const resultado = await filtrarArtista(filtrosListos)
    return resultado
  }catch(error){
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(500, "Hubo un error al intentar filtrar artistas");
    }
    throw error;
  }
}
