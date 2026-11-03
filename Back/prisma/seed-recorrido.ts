import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs/promises";

const prisma = new PrismaClient();
const carpeta = new URL(
  "../../docs-local/accesos-desarrollo/",
  import.meta.url,
);
const archivo = new URL("cuentas.json", carpeta);
const uid = (n: number) =>
  `af102026-1102-4000-8000-${String(n).padStart(12, "0")}`;
const estudioId = uid(100);
const identidades = [
  {
    id: uid(1),
    nombre: "Titular Taller Sur",
    email: "estudio.tallersur@inkmanager.example.test",
    rol: "ESTUDIO_ADMIN" as const,
    estilos: [],
    estudioId,
  },
  {
    id: uid(2),
    nombre: "Inés Romero",
    email: "ines.romero@inkmanager.example.test",
    rol: "ARTISTA" as const,
    estilos: ["Fine Line", "Botánico"],
    estudioId,
  },
  {
    id: uid(3),
    nombre: "Bautista Torres",
    email: "bautista.torres@inkmanager.example.test",
    rol: "ARTISTA" as const,
    estilos: ["Blackwork", "Geométrico"],
    estudioId,
  },
  {
    id: uid(4),
    nombre: "Leonor Sánchez",
    email: "leonor.independiente@inkmanager.example.test",
    rol: "ARTISTA" as const,
    estilos: ["Fine Line", "Ornamental"],
    estudioId: null,
  },
  {
    id: uid(5),
    nombre: "Manuel Rojas",
    email: "manuel.independiente@inkmanager.example.test",
    rol: "ARTISTA" as const,
    estilos: ["Tradicional", "Full Color"],
    estudioId: null,
  },
  {
    id: uid(6),
    nombre: "Delfina Acosta",
    email: "delfina.artista@inkmanager.example.test",
    rol: "ARTISTA" as const,
    estilos: ["Blackwork"],
    estudioId: null,
  },
];
interface Acceso {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: string;
  modalidad: string;
}
async function ejecutar() {
  await fs.mkdir(carpeta, { recursive: true });
  let anteriores: Acceso[] = [];
  try {
    anteriores = JSON.parse(await fs.readFile(archivo, "utf8"));
  } catch {
    /* Primera carga. */
  }
  const accesos: Acceso[] = identidades.map((i) => ({
    ...i,
    password:
      anteriores.find((a) => a.id === i.id)?.password ||
      `Ink!${crypto.randomBytes(15).toString("base64url")}7a`,
    modalidad:
      i.rol === "ESTUDIO_ADMIN"
        ? "Titular de Taller Sur"
        : i.estudioId
          ? "Artista de Taller Sur"
          : "Artista independiente",
  }));
  const passwords = await Promise.all(
    accesos.map((a) => bcrypt.hash(a.password, 10)),
  );
  await prisma.$transaction(
    async (tx) => {
      const nuevas = new Set<string>();
      for (const [index, i] of identidades.entries()) {
        const existentes = await tx.usuario.findMany({
          where: { OR: [{ email: i.email }, { id: i.id }] },
          select: { id: true, email: true },
        });
        if (
          existentes.some(
            (existente) => existente.id !== i.id || existente.email !== i.email,
          )
        )
          throw new Error(
            "La identidad de prueba entra en conflicto con otra cuenta.",
          );
        if (!existentes.length) nuevas.add(i.id);
        await tx.usuario.upsert({
          where: { id: i.id },
          create: {
            id: i.id,
            email: i.email,
            password: passwords[index],
            nombre: i.nombre,
            nombreArtistico: i.rol === "ARTISTA" ? i.nombre : null,
            rol: i.rol,
            emailVerificado: true,
            estilosPrincipales: i.estilos,
            metodosPagoAceptados: [],
            biografia:
              i.rol === "ARTISTA"
                ? "Diseños personalizados y atención con turno previo."
                : null,
            ciudad: "Buenos Aires",
            ciudadId: 704,
            pais: "AR",
            fotoPerfil: i.rol === "ARTISTA" ? "/images/artist-hands.jpg" : null,
          },
          update: { password: passwords[index] },
        });
      }
      await tx.estudio.upsert({
        where: { id: estudioId },
        create: {
          id: estudioId,
          nombre: "Taller Sur",
          slug: "desarrollo-recorrido-taller-sur",
          propietarioId: uid(1),
          ciudad: "Buenos Aires",
          pais: "AR",
          direccion: "Dirección de prueba 123",
          plazoPropuestasHoras: 48,
        },
        update: {},
      });
      for (const i of identidades)
        if (i.estudioId && nuevas.has(i.id))
          await tx.usuario.update({
            where: { id: i.id },
            data: { estudioId, estadoEnEstudio: "ACTIVO" },
          });
      const nombres = [
        "Sofía Aguirre",
        "Lucas Benítez",
        "Martina Costa",
        "Julieta Paz",
        "Mateo Acosta",
        "Nicolás Rivas",
        "Clara Molina",
        "Valentín Silva",
        "Alma Pereyra",
        "Franco Ortiz",
      ];
      const titulos = [
        "Rama de olivo en el antebrazo",
        "Flores silvestres en el hombro",
        "Composición ornamental para espalda",
        "Segunda sesión de manga",
        "Geometría en la pantorrilla",
        "Retoque de pieza tradicional",
        "Iniciales en línea fina",
        "Mandala para el antebrazo",
        "Golondrina tradicional",
        "Flores a color",
      ];
      const ahora = new Date();
      for (let n = 0; n < 10; n++) {
        const independiente = n < 6 ? null : n < 8 ? uid(4) : uid(5);
        const contactoId = uid(1000 + n),
          solicitudId = uid(2000 + n);
        await tx.contacto.upsert({
          where: { id: contactoId },
          create: {
            id: contactoId,
            nombre: nombres[n]!,
            email: `consulta.${n + 1}@clientes.example.test`,
            telefono: `+54 9 11 5500 ${String(1000 + n)}`,
            ciudad: "Buenos Aires",
            ...(independiente ? { artistaId: independiente } : { estudioId }),
          },
          update: {},
        });
        const asignada = n === 4,
          cerrada = n === 2 || n === 3 || asignada;
        await tx.solicitud.upsert({
          where: { id: solicitudId },
          create: {
            id: solicitudId,
            contactoId,
            ...(independiente
              ? { artistaDestinoId: independiente }
              : { estudioId }),
            titulo: titulos[n]!,
            estilo: n >= 8 ? "Tradicional" : n % 2 ? "Botánico" : "Fine Line",
            tipoColor: n >= 8 ? "COLOR" : "BLACK_AND_GREY",
            generoCuerpo: n % 2 ? "FEMENINO" : "MASCULINO",
            zonaGeneral: n === 2 ? "TORSO" : n === 4 ? "PIERNA" : "BRAZO",
            subZona:
              n === 2
                ? "Espalda"
                : n === 4
                  ? "Pantorrilla"
                  : n % 2
                    ? "Hombro"
                    : "Antebrazo interior",
            tamano: n % 2 ? "18 × 9 cm" : "12 × 5 cm",
            descripcion: `Me gustaría un diseño personalizado de ${titulos[n]!.toLowerCase()}. Prefiero líneas claras y que acompañe la forma de la zona elegida.`,
            referencias: ["/images/tattoo-detail.jpg"],
            canal: "WEB",
            estado:
              n === 2
                ? "POR_ASIGNAR"
                : n === 3
                  ? "ELECCION_CLIENTE"
                  : asignada
                    ? "ASIGNADA"
                    : "PENDIENTE",
            cerradaAt: cerrada ? ahora : null,
            cierrePropuestasAt:
              cerrada || n === 5
                ? null
                : new Date(ahora.getTime() + 48 * 3600000),
            artistaAsignadoId: asignada ? uid(3) : null,
            asignadaPor: asignada ? "ESTUDIO" : null,
          },
          update: {},
        });
        const artistas =
          n === 0
            ? [uid(2)]
            : n === 1 || n === 3
              ? [uid(2), uid(3)]
              : n === 4
                ? [uid(3)]
                : n === 6
                  ? [uid(4)]
                  : n === 8
                    ? [uid(5)]
                    : [];
        for (const [j, artistaId] of artistas.entries())
          await tx.cotizacion.upsert({
            where: { solicitudId_artistaId: { solicitudId, artistaId } },
            create: {
              id: uid(3000 + n * 10 + j),
              solicitudId,
              artistaId,
              monto: 138000 + n * 8000 + j * 25000,
              montoSena: 35000,
              mensaje: j
                ? "Diseño a medida y una sesión de hasta tres horas. Incluye una revisión del boceto."
                : "Diseño personalizado y sesión de dos horas, con revisión previa del diseño.",
              validaHasta: new Date(ahora.getTime() + 14 * 86400000),
              bocetoUrl: "/images/tattoo-detail.jpg",
            },
            update: {},
          });
      }
    },
    { timeout: 120000, maxWait: 15000 },
  );
  await fs.writeFile(archivo, JSON.stringify(accesos, null, 2));
  const lineas = accesos
    .map((a) => `| ${a.nombre} | ${a.modalidad} | ${a.email} | ${a.password} |`)
    .join("\n");
  await fs.writeFile(
    new URL("accesos.md", carpeta),
    `# Accesos de desarrollo\n\nCuentas nuevas de prueba cargadas en la BD configurada en Back/.env. Este archivo está ignorado por Git. No se enviaron correos.\n\n| Nombre | Modalidad | Email | Contraseña |\n| --- | --- | --- | --- |\n${lineas}\n\n- Titular: /estudio/consultas\n- Artistas: /artista/consultas\n- Iniciar sesión con email y contraseña, no con Google.\n- Los artistas del estudio comparten las consultas de Taller Sur. Los independientes tienen consultas propias.\n- Los emails de contacto terminados en example.test son ficticios.\n`,
  );
  console.log(
    `Creadas o verificadas: ${identidades.length} cuentas, 1 estudio y 10 consultas. Accesos en docs-local/accesos-desarrollo/accesos.md.`,
  );
}
ejecutar()
  .catch((error: unknown) => {
    console.error(
      "No se pudo completar la carga del recorrido. No se imprimieron credenciales.",
    );
    console.error(
      "Código:",
      error && typeof error === "object" && "code" in error
        ? error.code
        : "SIN_CODIGO",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
