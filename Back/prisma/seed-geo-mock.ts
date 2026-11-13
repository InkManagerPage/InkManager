import { Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';

export const estudiosMock = [
  {
    slug: 'inmortal-tattoo-caba',
    nombre: 'Inmortal Tattoo Studio',
    direccion: 'Av. Santa Fe 2100, Recoleta',
    ciudad: 'Buenos Aires',
    ciudadId: 704,
    pais: 'AR',
    zonaHoraria: 'America/Argentina/Buenos_Aires',
    emailContacto: 'contacto@inmortaltattoo.test',
  },
  {
    slug: 'sierras-ink-cba',
    nombre: 'Sierras Ink Tattoo',
    direccion: 'Av. Hipólito Yrigoyen 340, Nueva Córdoba',
    ciudad: 'Córdoba',
    ciudadId: 815,
    pais: 'AR',
    zonaHoraria: 'America/Argentina/Cordoba',
    emailContacto: 'info@sierrasink.test',
  },
  {
    slug: 'gran-via-tattoo-madrid',
    nombre: 'Gran Vía Tattoo Co.',
    direccion: 'Calle Gran Vía 42, Centro',
    ciudad: 'Madrid',
    ciudadId: 35186,
    pais: 'ES',
    zonaHoraria: 'Europe/Madrid',
    emailContacto: 'madrid@granviatattoo.test',
  },
  {
    slug: 'gotico-ink-bcn',
    nombre: 'Gótico Ink Barcelona',
    direccion: 'Carrer dels Banys Nous 12, Barri Gòtic',
    ciudad: 'Barcelona',
    ciudadId: 32653,
    pais: 'ES',
    zonaHoraria: 'Europe/Madrid',
    emailContacto: 'bcn@goticoink.test',
  },
  {
    slug: 'tenochtitlan-tattoo-cdmx',
    nombre: 'Tenochtitlan Tattoo Studio',
    direccion: 'Av. Insurgentes Sur 250, Roma Norte',
    ciudad: 'Ciudad de México',
    ciudadId: 72102,
    pais: 'MX',
    zonaHoraria: 'America/Mexico_City',
    emailContacto: 'contacto@tenochtitlantattoo.test',
  },
  {
    slug: 'andes-tattoo-stgo',
    nombre: 'Andes Tattoo Studio',
    direccion: 'Av. Providencia 1100, Providencia',
    ciudad: 'Santiago',
    ciudadId: 19111,
    pais: 'CL',
    zonaHoraria: 'America/Santiago',
    emailContacto: 'stgo@andestattoo.test',
  },
  {
    slug: 'monserrate-ink-bogota',
    nombre: 'Monserrate Ink',
    direccion: 'Cra. 7 #72-41, Chapinero',
    ciudad: 'Bogotá D.C.',
    ciudadId: 149237,
    pais: 'CO',
    zonaHoraria: 'America/Bogota',
    emailContacto: 'bogota@monserrateink.test',
  },
];

export const artistasMock = [
  // --- ARGENTINA: BUENOS AIRES (CABA) ---
  {
    email: 'mateo.viper@mock.inkmanager.com',
    nombre: 'Mateo Silva',
    nombreArtistico: 'Mateo "Viper" Silva',
    alias: 'mateo_viper',
    ciudad: 'Buenos Aires',
    ciudadId: 704,
    pais: 'AR',
    direccion: 'Av. Santa Fe 2100, CABA',
    radioAlcanceKm: 25,
    estilosPrincipales: ['Realismo', 'Blackwork'],
    anosExperiencia: 8,
    tarifaMinima: 45000,
    estudioSlug: 'inmortal-tattoo-caba',
  },
  {
    email: 'camila.line@mock.inkmanager.com',
    nombre: 'Camila Gómez',
    nombreArtistico: 'Cami Line',
    alias: 'cami_line',
    ciudad: 'Buenos Aires',
    ciudadId: 704,
    pais: 'AR',
    direccion: 'Av. Santa Fe 2100, CABA',
    radioAlcanceKm: 20,
    estilosPrincipales: ['Fine Line', 'Botánico', 'Minimalista'],
    anosExperiencia: 5,
    tarifaMinima: 35000,
    estudioSlug: 'inmortal-tattoo-caba',
  },
  {
    email: 'facundo.irezumi@mock.inkmanager.com',
    nombre: 'Facundo Rossi',
    nombreArtistico: 'Facu Irezumi',
    alias: 'facu_irezumi',
    ciudad: 'Buenos Aires',
    ciudadId: 704,
    pais: 'AR',
    direccion: 'Palermo Soho, CABA',
    radioAlcanceKm: 30,
    estilosPrincipales: ['Japonés', 'Tradicional'],
    anosExperiencia: 11,
    tarifaMinima: 50000,
    estudioSlug: null, // Independiente
  },

  // --- ARGENTINA: CÓRDOBA ---
  {
    email: 'valentina.rios@mock.inkmanager.com',
    nombre: 'Valentina Ríos',
    nombreArtistico: 'Valen NeoTrad',
    alias: 'valen_neotrad',
    ciudad: 'Córdoba',
    ciudadId: 815,
    pais: 'AR',
    direccion: 'Av. Hipólito Yrigoyen 340, Nueva Córdoba',
    radioAlcanceKm: 35,
    estilosPrincipales: ['Neotradicional', 'Full Color'],
    anosExperiencia: 7,
    tarifaMinima: 40000,
    estudioSlug: 'sierras-ink-cba',
  },
  {
    email: 'martin.punto@mock.inkmanager.com',
    nombre: 'Martín Castro',
    nombreArtistico: 'Martín Punto',
    alias: 'martin_punto',
    ciudad: 'Córdoba',
    ciudadId: 815,
    pais: 'AR',
    direccion: 'Barrio Güemes, Córdoba',
    radioAlcanceKm: 20,
    estilosPrincipales: ['Puntillismo', 'Geométrico'],
    anosExperiencia: 6,
    tarifaMinima: 35000,
    estudioSlug: null, // Independiente
  },

  // --- ARGENTINA: ROSARIO ---
  {
    email: 'rodrigo.mono@mock.inkmanager.com',
    nombre: 'Rodrigo López',
    nombreArtistico: 'Rodrigo Monochrome',
    alias: 'rodrigo_mono',
    ciudad: 'Rosario',
    ciudadId: 1384,
    pais: 'AR',
    direccion: 'Pichincha, Rosario',
    radioAlcanceKm: 25,
    estilosPrincipales: ['Blackwork', 'Darkwork'],
    anosExperiencia: 9,
    tarifaMinima: 38000,
    estudioSlug: null, // Independiente
  },

  // --- ESPAÑA: MADRID ---
  {
    email: 'alejandro.serrano@mock.inkmanager.com',
    nombre: 'Alejandro Serrano',
    nombreArtistico: 'Ale Serrano Realismo',
    alias: 'ale_serrano',
    ciudad: 'Madrid',
    ciudadId: 35186,
    pais: 'ES',
    direccion: 'Gran Vía 42, Madrid',
    radioAlcanceKm: 30,
    estilosPrincipales: ['Realismo', 'Microrealismo'],
    anosExperiencia: 10,
    tarifaMinima: 90,
    estudioSlug: 'gran-via-tattoo-madrid',
  },
  {
    email: 'elena.navarro@mock.inkmanager.com',
    nombre: 'Elena Navarro',
    nombreArtistico: 'Elena Botánica',
    alias: 'elena_fine',
    ciudad: 'Madrid',
    ciudadId: 35186,
    pais: 'ES',
    direccion: 'Malasaña, Madrid',
    radioAlcanceKm: 25,
    estilosPrincipales: ['Fine Line', 'Acuarela', 'Botánico'],
    anosExperiencia: 6,
    tarifaMinima: 70,
    estudioSlug: null, // Independiente
  },

  // --- ESPAÑA: BARCELONA ---
  {
    email: 'pau.costa@mock.inkmanager.com',
    nombre: 'Pau Costa',
    nombreArtistico: 'Pau OldSchool BCN',
    alias: 'pau_oldschool',
    ciudad: 'Barcelona',
    ciudadId: 32653,
    pais: 'ES',
    direccion: 'Carrer dels Banys Nous 12, Barcelona',
    radioAlcanceKm: 25,
    estilosPrincipales: ['Tradicional', 'Chicano'],
    anosExperiencia: 12,
    tarifaMinima: 85,
    estudioSlug: 'gotico-ink-bcn',
  },

  // --- MÉXICO: CDMX ---
  {
    email: 'diego.morales@mock.inkmanager.com',
    nombre: 'Diego Morales',
    nombreArtistico: 'Diego Chicano Art',
    alias: 'diego_chicano',
    ciudad: 'Ciudad de México',
    ciudadId: 72102,
    pais: 'MX',
    direccion: 'Roma Norte, Cuauhtémoc, CDMX',
    radioAlcanceKm: 40,
    estilosPrincipales: ['Chicano', 'Blackwork', 'Lettering'],
    anosExperiencia: 11,
    tarifaMinima: 1800,
    estudioSlug: 'tenochtitlan-tattoo-cdmx',
  },
  {
    email: 'ximena.cruz@mock.inkmanager.com',
    nombre: 'Ximena Cruz',
    nombreArtistico: 'Xime Anime Ink',
    alias: 'xime_anime',
    ciudad: 'Ciudad de México',
    ciudadId: 72102,
    pais: 'MX',
    direccion: 'Condesa, CDMX',
    radioAlcanceKm: 30,
    estilosPrincipales: ['Anime', 'Full Color', 'Ilustrativo'],
    anosExperiencia: 5,
    tarifaMinima: 1500,
    estudioSlug: null, // Independiente
  },

  // --- CHILE: SANTIAGO ---
  {
    email: 'sebastian.munoz@mock.inkmanager.com',
    nombre: 'Sebastián Muñoz',
    nombreArtistico: 'Seba Dark Andes',
    alias: 'seba_dark',
    ciudad: 'Santiago',
    ciudadId: 19111,
    pais: 'CL',
    direccion: 'Providencia, Santiago',
    radioAlcanceKm: 25,
    estilosPrincipales: ['Darkwork', 'Grabado', 'Blackwork'],
    anosExperiencia: 8,
    tarifaMinima: 60000,
    estudioSlug: 'andes-tattoo-stgo',
  },

  // --- COLOMBIA: BOGOTÁ ---
  {
    email: 'andres.restrepo@mock.inkmanager.com',
    nombre: 'Andrés Restrepo',
    nombreArtistico: 'Andrés NeoColor',
    alias: 'andres_color',
    ciudad: 'Bogotá D.C.',
    ciudadId: 149237,
    pais: 'CO',
    direccion: 'Chapinero, Bogotá',
    radioAlcanceKm: 30,
    estilosPrincipales: ['Neotradicional', 'Full Color', 'Acuarela'],
    anosExperiencia: 9,
    tarifaMinima: 220000,
    estudioSlug: 'monserrate-ink-bogota',
  },

  // --- URUGUAY: MONTEVIDEO ---
  {
    email: 'lucia.farias@mock.inkmanager.com',
    nombre: 'Lucía Farías',
    nombreArtistico: 'Lucía Botánica UY',
    alias: 'lucia_botanica',
    ciudad: 'Montevideo',
    ciudadId: 129833,
    pais: 'UY',
    direccion: 'Pocitos, Montevideo',
    radioAlcanceKm: 20,
    estilosPrincipales: ['Botánico', 'Fine Line', 'Minimalista'],
    anosExperiencia: 6,
    tarifaMinima: 2800,
    estudioSlug: null, // Independiente
  },
];

export const clientesMock = [
  {
    email: 'cliente.caba@mock.inkmanager.com',
    nombre: 'Nicolás Gómez',
    alias: 'nico_gomez',
    ciudad: 'Buenos Aires',
    ciudadId: 704,
    pais: 'AR',
    telefono: '+5491144556677',
  },
  {
    email: 'cliente.cba@mock.inkmanager.com',
    nombre: 'Gonzalo Pérez',
    alias: 'gonza_cba',
    ciudad: 'Córdoba',
    ciudadId: 815,
    pais: 'AR',
    telefono: '+5493514455667',
  },
  {
    email: 'cliente.madrid@mock.inkmanager.com',
    nombre: 'Carla Sánchez',
    alias: 'carla_madrid',
    ciudad: 'Madrid',
    ciudadId: 35186,
    pais: 'ES',
    telefono: '+34612345678',
  },
  {
    email: 'cliente.cdmx@mock.inkmanager.com',
    nombre: 'Emiliano Hernández',
    alias: 'emiliano_cdmx',
    ciudad: 'Ciudad de México',
    ciudadId: 72102,
    pais: 'MX',
    telefono: '+525512345678',
  },
  {
    email: 'cliente.stgo@mock.inkmanager.com',
    nombre: 'Felipe Jara',
    alias: 'felipe_stgo',
    ciudad: 'Santiago',
    ciudadId: 19111,
    pais: 'CL',
    telefono: '+56912345678',
  },
];

async function main() {
  console.log('🚀 Iniciando carga de mocks geográficos...');
  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // 1. Crear / Actualizar Estudios
  const estudiosPorSlug = new Map<string, string>();
  for (const item of estudiosMock) {
    const estudio = await prisma.estudio.upsert({
      where: { slug: item.slug },
      update: {
        nombre: item.nombre,
        direccion: item.direccion,
        ciudad: item.ciudad,
        ciudadId: item.ciudadId,
        pais: item.pais,
        zonaHoraria: item.zonaHoraria,
        emailContacto: item.emailContacto,
      },
      create: {
        slug: item.slug,
        nombre: item.nombre,
        direccion: item.direccion,
        ciudad: item.ciudad,
        ciudadId: item.ciudadId,
        pais: item.pais,
        zonaHoraria: item.zonaHoraria,
        emailContacto: item.emailContacto,
      },
    });
    estudiosPorSlug.set(item.slug, estudio.id);
    console.log(`  🏛️ Estudio listo: ${estudio.nombre} (${item.ciudad}, ${item.pais})`);
  }

  // 2. Crear / Actualizar Artistas
  for (const item of artistasMock) {
    const estudioId = item.estudioSlug ? estudiosPorSlug.get(item.estudioSlug) : null;
    const artista = await prisma.usuario.upsert({
      where: { email: item.email },
      update: {
        password: passwordHash,
        nombre: item.nombre,
        nombreArtistico: item.nombreArtistico,
        alias: item.alias,
        rol: Rol.ARTISTA,
        ciudad: item.ciudad,
        ciudadId: item.ciudadId,
        pais: item.pais,
        direccion: item.direccion,
        radioAlcanceKm: item.radioAlcanceKm,
        estilosPrincipales: item.estilosPrincipales,
        anosExperiencia: item.anosExperiencia,
        tarifaMinima: item.tarifaMinima,
        estudioId: estudioId ?? null,
      },
      create: {
        email: item.email,
        password: passwordHash,
        nombre: item.nombre,
        nombreArtistico: item.nombreArtistico,
        alias: item.alias,
        rol: Rol.ARTISTA,
        ciudad: item.ciudad,
        ciudadId: item.ciudadId,
        pais: item.pais,
        direccion: item.direccion,
        radioAlcanceKm: item.radioAlcanceKm,
        estilosPrincipales: item.estilosPrincipales,
        anosExperiencia: item.anosExperiencia,
        tarifaMinima: item.tarifaMinima,
        estudioId: estudioId ?? null,
      },
    });
    console.log(`  🎨 Artista listo: ${artista.nombreArtistico} | Estilos: [${item.estilosPrincipales.join(', ')}] | Ciudad: ${item.ciudad}`);
  }

  // 3. Crear / Actualizar Clientes
  for (const item of clientesMock) {
    const cliente = await prisma.usuario.upsert({
      where: { email: item.email },
      update: {
        password: passwordHash,
        nombre: item.nombre,
        alias: item.alias,
        ciudad: item.ciudad,
        ciudadId: item.ciudadId,
        pais: item.pais,
        telefono: item.telefono,
      },
      create: {
        email: item.email,
        password: passwordHash,
        nombre: item.nombre,
        alias: item.alias,
        rol: Rol.CLIENTE,
        ciudad: item.ciudad,
        ciudadId: item.ciudadId,
        pais: item.pais,
        telefono: item.telefono,
      },
    });
    console.log(`  👤 Cliente listo: ${cliente.nombre} (${item.ciudad}, ${item.pais})`);
  }

  console.log('✅ Mock geográfico cargado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error al cargar mock:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
