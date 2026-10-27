import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/config/prisma.js";
import cloudinary from "../src/config/cloudinary.js";
import { validarCiudad } from "../src/ubicaciones/ubicaciones.service.js";
import { validarEstilos } from "../src/estilos/estilos.service.js";
import {
  artistasDemo,
  estudiosDemo,
  emailDemo,
  idTrabajoDemo,
} from "./catalogo-demo.js";

const fotosTrabajos = ["tattoo-detail", "artist-hands", "studio-session"];
const carpetaCloudinary = "inkmanager/catalogo-demo";

async function cargarFoto(archivo: URL, nombre: string) {
  const imagen = await cloudinary.uploader.upload(fileURLToPath(archivo), {
    public_id: `${carpetaCloudinary}/${nombre}`,
    overwrite: false,
    resource_type: "image",
    format: "webp",
    tags: ["catalogo-demo"],
    transformation: [
      { width: 1200, height: 1200, crop: "limit", quality: "auto:good" },
    ],
  });
  return imagen.secure_url;
}

async function eliminarDemo() {
  // Estos correos y slugs están reservados para este conjunto de prueba.
  const emails = artistasDemo.map((_, indice) => emailDemo(indice));
  const slugs = estudiosDemo.map((estudio) => estudio.slug);
  const cuentasActivas = await prisma.usuario.count({
    where: {
      email: { in: emails },
      OR: [
        { googleId: { not: null } },
        { password: { not: null } },
        { rol: { not: "ARTISTA" } },
      ],
    },
  });
  if (cuentasActivas)
    throw new Error(
      "Hay perfiles de prueba convertidos en cuentas activas. No se eliminó ningún dato.",
    );
  await prisma.$transaction(async (tx) => {
    await tx.usuario.deleteMany({
      where: { email: { in: emails }, googleId: null, password: null },
    });
    await tx.estudio.deleteMany({
      where: { slug: { in: slugs }, usuarios: { none: {} } },
    });
  });
  const retratos = [...new Set(artistasDemo.map((artista) => artista.retrato))];
  for (const nombre of [...retratos, ...fotosTrabajos]) {
    await cloudinary.uploader.destroy(`${carpetaCloudinary}/${nombre}`);
  }
  console.log("Datos e imágenes del catálogo de prueba retirados.");
}

async function main() {
  if (process.argv.includes("--remove")) return eliminarDemo();

  const retratos = [...new Set(artistasDemo.map((artista) => artista.retrato))];
  const archivos = [
    ...retratos.map((nombre) => ({
      nombre,
      archivo: new URL(`../assets/portraits/${nombre}.png`, import.meta.url),
    })),
    ...fotosTrabajos.map((nombre) => ({
      nombre,
      archivo: new URL(
        `../../Front/public/images/${nombre}.jpg`,
        import.meta.url,
      ),
    })),
  ];
  for (const { archivo } of archivos) await access(archivo);
  for (const artista of artistasDemo) {
    validarCiudad(artista.ciudadId);
    validarEstilos(artista.estilos);
  }
  // Evita modificar una cuenta que haya dejado de ser un perfil de prueba.
  for (let indice = 0; indice < artistasDemo.length; indice++) {
    const existente = await prisma.usuario.findUnique({
      where: { email: emailDemo(indice) },
    });
    if (
      existente &&
      (existente.password || existente.googleId || existente.rol !== "ARTISTA")
    ) {
      throw new Error(
        "Uno de los correos reservados ya pertenece a una cuenta activa.",
      );
    }
  }

  const fotos = new Map<string, string>();
  for (const { nombre, archivo } of archivos)
    fotos.set(nombre, await cargarFoto(archivo, nombre));

  await prisma.$transaction(
    async (tx) => {
      const estudios = [];
      for (const estudio of estudiosDemo) {
        const ubicacion = validarCiudad(estudio.ciudadId);
        const datos = {
          nombre: estudio.nombre,
          ciudad: ubicacion.ciudad,
          pais: ubicacion.pais,
        };
        estudios.push(
          await tx.estudio.upsert({
            where: { slug: estudio.slug },
            create: { slug: estudio.slug, ...datos },
            update: datos,
          }),
        );
      }
      for (const [indice, artista] of artistasDemo.entries()) {
        const datos = {
          nombre: artista.nombre,
          nombreArtistico: artista.nombre,
          biografia: `Trabajo en ${artista.estilos.join(" y ")}. Diseños personalizados y atención con turno previo.`,
          ...validarCiudad(artista.ciudadId),
          estilosPrincipales: artista.estilos,
          fotoPerfil: fotos.get(artista.retrato)!,
          estudioId:
            artista.estudio === null ? null : estudios[artista.estudio]!.id,
        };
        const usuario = await tx.usuario.upsert({
          where: { email: emailDemo(indice) },
          create: {
            email: emailDemo(indice),
            rol: "ARTISTA",
            password: null,
            metodosPagoAceptados: [],
            ...datos,
          },
          update: datos,
        });
        for (let trabajo = 0; trabajo < 2; trabajo++) {
          const estilo = artista.estilos[trabajo]!;
          const datosTrabajo = {
            url: fotos.get(
              fotosTrabajos[(indice + trabajo) % fotosTrabajos.length]!,
            )!,
            descripcion: `Diseño en ${estilo.toLowerCase()} de ${artista.nombre}.`,
            estilos: trabajo === 0 ? [estilo] : artista.estilos,
            estado: "PUBLICADO" as const,
            usuarioId: usuario.id,
          };
          const id = idTrabajoDemo(indice * 2 + trabajo);
          await tx.fotoGaleria.upsert({
            where: { id },
            create: { id, ...datosTrabajo },
            update: datosTrabajo,
          });
        }
      }
    },
    { timeout: 30000 },
  );
  console.log(
    "Catálogo listo: 8 artistas, 2 estudios y 16 trabajos. Podés repetir la carga sin duplicarlos.",
  );
}

main()
  .catch((error: unknown) => {
    // No mostramos conexiones ni credenciales de los proveedores.
    console.error(
      error instanceof Error && !error.name.startsWith("Prisma")
        ? error.message
        : "No se pudo cargar el catálogo. Revisá la conexión y el esquema de la base.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
