import { PrismaClient, Rol, GeneroCuerpo, TipoColor, ZonaCuerpoGeneral, EstadoSolicitud } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🌱 Limpiando tablas...');
  await prisma.cotizacion.deleteMany();
  await prisma.solicitud.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.estudio.deleteMany();

  console.log('🏛️ Creando estudios...');
  const estudio1 = await prisma.estudio.create({
    data: {
      nombre: 'Black Ink Society',
      slug: 'black-ink-society',
      direccion: 'Av. Corrientes 1234',
      ciudad: 'Buenos Aires',
      pais: 'Argentina',
    },
  });

  const estudio2 = await prisma.estudio.create({
    data: {
      nombre: 'Sacred Art Tattoo Studio',
      slug: 'sacred-art-tattoo',
      direccion: 'Calle 50 #789',
      ciudad: 'La Plata',
      pais: 'Argentina',
    },
  });

  console.log('🎨 Creando artistas...');
const artista1 = await prisma.usuario.create({
  data: {
    email: "lucas.realism@inkmanager.com",
    password: "password123", // 👈 Campo obligatorio agregado
    nombre: "Lucas \"Realismo\" Gómez",
    alias: "lucas_realism",
    rol: "ARTISTA",
    telefono: "+5491122334455",
    estudioId: estudio1.id,
  },
});

  const artista2 = await prisma.usuario.create({
    data: {
      email: 'sofi.fineline@inkmanager.com',
      password: 'password123',
      nombre: 'Sofía Martínez',
      alias: 'sofi_fineline',
      rol: Rol.ARTISTA,
      telefono: '+5491133445566',
      estudioId: estudio2.id,
    },
  });

  console.log('👤 Creando clientes...');
  const cliente1 = await prisma.usuario.create({
    data: {
      email: 'juan.perez@gmail.com',
      password: 'password123',
      nombre: 'Juan Pérez',
      alias: 'juanp',
      rol: Rol.CLIENTE,
      telefono: '+5491199887766',
    },
  });

  const cliente2 = await prisma.usuario.create({
    data: {
      email: 'maria.lopez@gmail.com',
      password: 'password123',
      nombre: 'María López',
      alias: 'marilopez',
      rol: Rol.CLIENTE,
      telefono: '+5491188776655',
    },
  });

  console.log('📋 Creando proyectos/solicitudes con zonas marcadas...');
  const solicitud1 = await prisma.solicitud.create({
    data: {
      clienteId: cliente1.id,
      estudioId: estudio1.id,
      estilo: 'realism',
      tipoColor: TipoColor.BLACK_AND_GREY,
      generoCuerpo: GeneroCuerpo.MASCULINO,
      zonaGeneral: ZonaCuerpoGeneral.BRAZO,
      subZona: 'inner_arm',
      imagenZonaMarcada: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      descripcion: 'Retrato de león realista en antebrazo interno.',
      referencias: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
      estado: EstadoSolicitud.EN_COTIZACION,
    },
  });

  const solicitud2 = await prisma.solicitud.create({
    data: {
      clienteId: cliente2.id,
      estudioId: estudio2.id,
      estilo: 'fineline',
      tipoColor: TipoColor.COLOR,
      generoCuerpo: GeneroCuerpo.FEMENINO,
      zonaGeneral: ZonaCuerpoGeneral.TORSO,
      subZona: 'ribs',
      imagenZonaMarcada: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      descripcion: 'Ramo de flores en línea fina sobre las costillas.',
      referencias: [],
      estado: EstadoSolicitud.PENDIENTE,
    },
  });

  const solicitud3 = await prisma.solicitud.create({
    data: {
      clienteId: cliente1.id,
      estudioId: estudio1.id,
      estilo: 'black work',
      tipoColor: TipoColor.BLACK_AND_GREY,
      generoCuerpo: GeneroCuerpo.MASCULINO,
      zonaGeneral: ZonaCuerpoGeneral.PIERNA,
      subZona: 'outer_leg',
      imagenZonaMarcada: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      descripcion: 'Geometría ornamental en la parte externa de la pierna.',
      referencias: [],
      estado: EstadoSolicitud.PENDIENTE,
    },
  });

  console.log('💰 Creando cotización...');
  await prisma.cotizacion.create({
    data: {
      solicitudId: solicitud1.id,
      artistaId: artista1.id,
      monto: 150000,
      montoSena: 30000,
      mensaje: 'Hola Juan, requiere 2 sesiones de 4 horas.',
    },
  });

  console.log('✅ Base de datos poblada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });