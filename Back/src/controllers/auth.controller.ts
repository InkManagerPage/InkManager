import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const registerArtist = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      // Paso 1: OBLIGATORIOS BÁSICOS
      email,
      password,
      nombre,
      nombreArtistico,

      // Paso 1: OPCIONALES
      alias,
      telefono,
      dniPasaporte,

      // Paso 2: OPCIONALES (Ubicación)
      tipoTrabajo,
      direccion,
      ciudad,
      pais,
      radioAlcanceKm,
      horariosAtencion,

      // Paso 3: OPCIONALES (Perfil & Portafolio)
      estilosPrincipales,
      instagram,
      tiktok,
      sitioWeb,
      anosExperiencia,
      galeria, // Array de { url: string, esCicatrizado?: boolean }

      // Paso 4: OPCIONALES (Tarifas)
      tarifaMinima,
      modalidadCobro,
      requiereSena,
      montoPorcentajeSena,
      politicaCancelacion,
      metodosPagoAceptados,
      cbuAliasBancario,

      // Paso 5: OPCIONALES (Documentación para Verificación)
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
    } = req.body;

    // 1. Validaciones mínimas obligatorias
    if (!email || !password || !nombre || !nombreArtistico) {
      res.status(400).json({
        error: 'Los campos Email, Contraseña, Nombre y Nombre Artístico son obligatorios.',
      });
      return;
    }

    // 2. Validar email único
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
      return;
    }

    // 3. Determinar estado de verificación preliminar
    // Si adjunta documento y licencia sanitaria, entra en revisión PENDIENTE
    const estadoVerificacion =
      documentoIdentidadUrl || licenciaSanitariaUrl ? 'PENDIENTE' : 'NO_VERIFICADO';

    // 4. Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Token único de verificación por correo
    const tokenVerificacionEmail = crypto.randomBytes(32).toString('hex');

    // 6. Crear el registro en Prisma (manejo seguro de nulos y opcionales)
    const nuevoArtista = await prisma.usuario.create({
      data: {
        // Datos Obligatorios
        email,
        password: hashedPassword,
        nombre,
        nombreArtistico,
        rol: 'ARTISTA',
        tokenVerificacionEmail,
        emailVerificado: false,
        estadoVerificacion,

        // Datos Personales Opcionales
        alias: alias || nombreArtistico.toLowerCase().replace(/\s+/g, '_'),
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
        radioAlcanceKm: radioAlcanceKm ? parseInt(String(radioAlcanceKm)) : 20,
        horariosAtencion: horariosAtencion || null,

        // Perfil Artístico
        estilosPrincipales: Array.isArray(estilosPrincipales) ? estilosPrincipales : [],
        instagram: instagram || null,
        tiktok: tiktok || null,
        sitioWeb: sitioWeb || null,
        anosExperiencia: anosExperiencia ? parseInt(String(anosExperiencia)) : null,

        // Tarifas y Reglas Económicas
        tarifaMinima: tarifaMinima ? parseFloat(String(tarifaMinima)) : null,
        modalidadCobro: modalidadCobro || null,
        requiereSena: requiereSena ?? true,
        montoPorcentajeSena: montoPorcentajeSena ? parseFloat(String(montoPorcentajeSena)) : null,
        politicaCancelacion: politicaCancelacion || null,
        metodosPagoAceptados: Array.isArray(metodosPagoAceptados) ? metodosPagoAceptados : [],
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
        tamanoMinimoCm: tamanoMinimoCm ? parseInt(String(tamanoMinimoCm)) : 5,

        // Galería (si la envía durante el onboarding)
        galeria:
          Array.isArray(galeria) && galeria.length > 0
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
        estadoVerificacion: true,
        emailVerificado: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Artista registrado con éxito.',
      user: nuevoArtista,
      verificationToken: tokenVerificacionEmail,
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