import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { moneda } from "../../Front/src/lib/panel-artista.js";
import { validarCotizacion } from "../src/cotizaciones/cotizaciones.validation.js";
import {
  estadoPanel,
  presentarSolicitud,
  type AmbitoConsultas,
  type SolicitudCompleta,
} from "../src/solicitudes/solicitudes.entity.js";
import { filtroAmbito } from "../src/solicitudes/solicitudes.repository.js";
import {
  cerrarEnTransaccion,
  cotizacionesVigentes,
  comprobarVersion,
} from "../src/solicitudes/solicitudes.service.js";
import { validarIdConsulta } from "../src/solicitudes/solicitudes.validation.js";

const ahora = new Date("2030-11-02T12:00:00Z");
const ambito: AmbitoConsultas = {
  email: "artista@example.test",
  emailVerificado: true,
  usuarioId: "artista-a",
  tipo: "ESTUDIO",
  estudioId: "estudio-a",
  nombre: "Estudio",
  administra: false,
  puedeProponer: true,
  zonaHoraria: "America/Argentina/Buenos_Aires",
};
function solicitud(): SolicitudCompleta {
  return {
    id: "solicitud-a",
    estado: "PENDIENTE",
    estudioId: "estudio-a",
    artistaDestinoId: null,
    artistaAsignadoId: null,
    contactoId: "contacto-a",
    clienteId: null,
    titulo: "Rama de olivo",
    descripcion: "Una rama en el antebrazo.",
    estilo: "Fine Line",
    subZona: "Antebrazo",
    tamano: "12 × 5 cm",
    tipoColor: "BLACK_AND_GREY",
    generoCuerpo: "FEMENINO",
    zonaGeneral: "BRAZO",
    canal: "WEB",
    notas: "",
    referencias: [],
    imagenZonaMarcada: null,
    version: 0,
    cierrePropuestasAt: null,
    cerradaAt: null,
    asignadaPor: null,
    createdAt: ahora,
    updatedAt: ahora,
    cliente: null,
    contacto: null,
    cotizaciones: ["artista-a", "artista-b"].map((id, n) => ({
      id: `propuesta-${n}`,
      artistaId: id,
      solicitudId: "solicitud-a",
      monto: new Prisma.Decimal(150000 + n * 10000),
      montoSena: new Prisma.Decimal(30000),
      mensaje: "Diseño a medida y sesión de dos horas.",
      validaHasta: new Date("2030-11-10T23:59:59Z"),
      bocetoUrl: null,
      bocetoPublicId: null,
      createdAt: ahora,
      updatedAt: ahora,
      artista: {
        id,
        nombre: "Artista",
        nombreArtistico: null,
        estudioId: "estudio-a",
        estadoEnEstudio: "ACTIVO",
        rol: "ARTISTA",
      },
    })),
  } as SolicitudCompleta;
}

test("cotizaciones: valida dinero, decimales, fecha real, detalle y versión", () => {
  const base = {
    importe: "153000.50",
    sena: "35000",
    detalle: "Diseño y sesión de dos horas.",
    validez: "2030-11-05",
    version: "0",
  };
  assert.equal(validarCotizacion(base, ahora).importe, 153000.5);
  for (const cambio of [
    { importe: "100.123" },
    { importe: -1 },
    { importe: Infinity },
    { importe: 0 },
    { importe: "1e6" },
    { sena: 200000 },
    { detalle: "corto" },
    { validez: "2030-02-30" },
    { validez: "2030-11-01" },
    { version: -1 },
    { version: "1.2" },
  ])
    assert.throws(() => validarCotizacion({ ...base, ...cambio }, ahora));
});
test("consultas: el filtro no permite elegir otro estudio ni ver consultas abiertas estando suspendido", () => {
  assert.deepEqual(filtroAmbito(ambito), { estudioId: "estudio-a" });
  assert.deepEqual(filtroAmbito({ ...ambito, puedeProponer: false }), {
    estudioId: "estudio-a",
    artistaAsignadoId: "artista-a",
  });
  assert.deepEqual(
    filtroAmbito({
      ...ambito,
      tipo: "INDEPENDIENTE",
      estudioId: null,
      administra: true,
    }),
    { artistaDestinoId: "artista-a", estudioId: null },
  );
});
test("consultas: los DTO ocultan propuestas ajenas para el artista y conservan importes numéricos", () => {
  assert.equal(presentarSolicitud(solicitud(), ambito).propuestas.length, 1);
  const propietario = presentarSolicitud(solicitud(), {
    ...ambito,
    administra: true,
  });
  assert.equal(propietario.propuestas.length, 2);
  assert.equal(typeof propietario.propuestas[0].importe, "number");
  assert.ok(!JSON.stringify(propietario).includes("password"));
});
test("cierre: excluye artistas suspendidos, trasladados y propuestas vencidas", () => {
  const s = solicitud();
  s.cotizaciones[0].artista.estadoEnEstudio = "SUSPENDIDO";
  assert.equal(cotizacionesVigentes(s, ahora).length, 1);
  s.cotizaciones[1].artista.estudioId = "otro";
  assert.equal(cotizacionesVigentes(s, ahora).length, 0);
  s.cotizaciones[0].artista.estadoEnEstudio = "ACTIVO";
  s.cotizaciones[0].validaHasta = new Date("2030-11-01");
  assert.equal(cotizacionesVigentes(s, ahora).length, 0);
});
test("cierre: sin propuestas asigna al titular, con una asigna artista, con varias espera elección", async () => {
  for (const n of [0, 1, 2]) {
    const s = solicitud();
    s.cotizaciones = s.cotizaciones.slice(0, n);
    let escritura: any;
    const tx = {
      solicitud: {
        update: async ({ data }: any) => {
          escritura = data;
          return { ...s, ...data };
        },
      },
    } as unknown as Prisma.TransactionClient;
    await cerrarEnTransaccion(tx, s, ahora);
    assert.equal(
      escritura.estado,
      ["POR_ASIGNAR", "ASIGNADA", "ELECCION_CLIENTE"][n],
    );
    assert.equal(escritura.artistaAsignadoId, n === 1 ? "artista-a" : null);
    assert.deepEqual(escritura.version, { increment: 1 });
  }
});
test("cierre: conserva asignaciones existentes y rechaza ediciones de versiones antiguas", async () => {
  const s = { ...solicitud(), estado: "ASIGNADA" as const, version: 3 };
  assert.equal(await cerrarEnTransaccion({} as Prisma.TransactionClient, s), s);
  comprobarVersion(s, 3);
  assert.throws(() => comprobarVersion(s, 2), /cambió/);
  assert.equal(estadoPanel("PENDIENTE"), "ABIERTA");
  assert.equal(estadoPanel("CANCELADO"), "ARCHIVADA");
  assert.throws(() => validarIdConsulta("../../otro"));
});

test("importes: muestra los centavos persistidos sin redondear a pesos enteros", () => {
  assert.match(moneda(123500.25), /123.500,25/);
});
