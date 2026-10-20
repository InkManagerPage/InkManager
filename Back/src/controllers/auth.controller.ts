import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const registerArtist = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      // Paso 1: Datos de cuenta y personales
      email,
      password,
      nombre,
      nombreArtistico,
      alias,
      telefono,
      dniPasaporte,

      // Paso 2: Ubicación y Modalidad
      tipoTrabajo,
      direccion,
      ciudad,
      pais,
      radioAlcanceKm,
      horariosAtencion,

      // Paso 3: Perfil Artístico y Redes
      estilosPrincipales,
      instagram,
      tiktok,
      sitioWeb,
      anosExperiencia,
      galeria, // Array de { url: string, esCicatrizado: boolean }

      // Paso 4: Tarifas y Reglas Económicas
      tarifaMinima,
      modalidadCobro,
      requiereSena,
      montoPorcentajeSena,
      politicaCancelacion,
      metodosPagoAceptados,
      cbuAliasBancario,

      // Paso 5: Higiene, Licencias y Preferencias
      numeroLicencia,
      licenciaSanitariaUrl,
      documentoIdentidadUrl,
      aceptaDeclaracionHigiene,
      aceptaCoverUp,
      aceptaCicatrices,
      aceptaRetoques,
      aceptaCaraManos,
      copiaDisenosInternet,
      tamanoMinimoCm,
    } = req.body;

    // 1. Validar que el email no esté registrado
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
      return;
    }

    // 2. Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Generar token único para verificación de email
    const tokenVerificacionEmail = crypto.randomBytes(32).toString('hex');

    // 4. Crear el usuario en la base de datos
    const nuevoArtista = await prisma.usuario.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        nombreArtistico,
        alias: alias || nombreArtistico?.toLowerCase().replace(/\s+/g, '_'),
        rol: 'ARTISTA',
        telefono,
        dniPasaporte,
        documentoIdentidadUrl,
        tokenVerificacionEmail,
        emailVerificado: false,

        // Ubicación
        tipoTrabajo,
        direccion,
        ciudad,
        pais,
        radioAlcanceKm: radioAlcanceKm ? parseInt(radioAlcanceKm) : 20,
        horariosAtencion,

        // Perfil Artístico
        estilosPrincipales: estilosPrincipales || [],
        instagram,
        tiktok,
        sitioWeb,
        anosExperiencia: anosExperiencia ? parseInt(anosExperiencia) : null,

        // Tarifas
        tarifaMinima: tarifaMinima ? parseFloat(tarifaMinima) : null,
        modalidadCobro,
        requiereSena: requiereSena ?? true,
        montoPorcentajeSena: montoPorcentajeSena ? parseFloat(montoPorcentajeSena) : null,
        politicaCancelacion,
        metodosPagoAceptados: metodosPagoAceptados || [],
        cbuAliasBancario,

        // Licencias e Higiene
        numeroLicencia,
        licenciaSanitariaUrl,
        aceptaDeclaracionHigiene: aceptaDeclaracionHigiene ?? false,

        // Preferencias
        aceptaCoverUp: aceptaCoverUp ?? true,
        aceptaCicatrices: aceptaCicatrices ?? true,
        aceptaRetoques: aceptaRetoques ?? true,
        aceptaCaraManos: aceptaCaraManos ?? false,
        copiaDisenosInternet: copiaDisenosInternet ?? false,
        tamanoMinimoCm: tamanoMinimoCm ? parseInt(tamanoMinimoCm) : 5,

        // Fotos de Galería asociadas
        galeria: galeria?.length
          ? {
              create: galeria.map((foto: { url: string; esCicatrizado?: boolean }) => ({
                url: foto.url,
                esCicatrizado: foto.esCicatrizado || false,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        nombreArtistico: true,
        rol: true,
        emailVerificado: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Artista registrado con éxito. Se ha enviado un token de verificación.',
      user: nuevoArtista,
      verificationToken: tokenVerificacionEmail, // Para facilitar pruebas locales
    });
  } catch (error) {
    console.error('Error al registrar artista:', error);
    res.status(500).json({ error: 'Ocurrió un error al procesar el registro del artista.' });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Token de verificación no proporcionado o inválido.' });
      return;
    }

    const usuario = await prisma.usuario.findFirst({
      where: { tokenVerificacionEmail: token },
    });

    if (!usuario) {
      res.status(404).json({ error: 'Token de verificación inválido o expirado.' });
      return;
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        emailVerificado: true,
        tokenVerificacionEmail: null,
      },
    });

    res.status(200).json({ message: 'Correo electrónico verificado exitosamente.' });
  } catch (error) {
    console.error('Error al verificar email:', error);
    res.status(500).json({ error: 'Error interno al verificar el correo.' });
  }
};