import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { Rol } from '@prisma/client';
import cloudinary from '../src/config/cloudinary.js';
import { prisma } from '../src/config/prisma.js';
import { reviewArtists } from './review-artists.js';

async function main() {
  // Comprobamos la configuración y las fotos antes de crear registros.
  for (const key of [
    'DATABASE_URL',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ]) {
    if (!process.env[key]) throw new Error(`Falta configurar ${key}.`);
  }
  for (const artist of reviewArtists) {
    console.log(`Preparando perfil: ${artist.nombre}`);
    await access(new URL(`../assets/portraits/${artist.slug}.png`, import.meta.url));
  }

  for (const artist of reviewArtists) {
    const existing = await prisma.usuario.findUnique({
      where: { email: artist.email },
      select: { id: true, rol: true, fotoPerfil: true, fotoPublicId: true },
    });
    if (existing && existing.rol !== Rol.ARTISTA) {
      throw new Error(`El perfil ${artist.slug} ya existe con otro rol.`);
    }

    let fotoUrl = existing?.fotoPerfil;
    let fotoPublicId = existing?.fotoPublicId;

    if (!fotoUrl || !fotoPublicId) {
      const imagePath = fileURLToPath(
        new URL(`../assets/portraits/${artist.slug}.png`, import.meta.url),
      );
      // Un ID fijo evita duplicar fotos al volver a ejecutar el script.
      const image = await cloudinary.uploader.upload(imagePath, {
        public_id: `inkmanager/artistas/${artist.slug}`,
        overwrite: false,
        resource_type: 'image',
        tags: ['inkmanager', 'perfiles-ejemplo'],
        transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
      });
      fotoPublicId = image.public_id;
      fotoUrl = cloudinary.url(image.public_id, {
        secure: true,
        version: image.version,
        transformation: [
          {
            width: 160,
            height: 160,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
      });
    }

    const review = { fotoPerfil: fotoUrl, fotoPublicId, resena: artist.resena };
    await prisma.usuario.upsert({
      where: { email: artist.email },
      // En los artistas existentes conservamos nombre, estudio y demás datos.
      update: review,
      create: {
        email: artist.email,
        nombre: artist.nombre,
        alias: artist.alias,
        // Los perfiles de ejemplo no tienen una contraseña conocida para iniciar sesión.
        password: await hash(randomBytes(32).toString('hex'), 12),
        rol: Rol.ARTISTA,
        ...review,
      },
    });
    console.log(`Perfil listo: ${artist.nombre}`);
  }
}

main()
  .catch((error) => {
    const detail = error?.error || error;
    const code = detail?.code || detail?.http_code || detail?.name || 'desconocido';
    console.error(
      `No se pudo completar la carga (${code}). Revisá la configuración, las fotos y la conexión. Podés volver a ejecutar este script sin duplicar perfiles.`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
