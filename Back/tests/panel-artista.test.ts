import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { after, beforeEach, test, type TestContext } from "node:test";

process.env.DATABASE_URL =
  "postgresql://test:test@127.0.0.1:1/test?connect_timeout=1";
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.JWT_SECRET = "solo-pruebas-panel-artista-32-bytes-inkmanager";
process.env.FRONTEND_URL = "http://127.0.0.1:3001";
process.env.MAIL_TRANSPORT = "resend";
process.env.RESEND_API_KEY = "";
process.env.NODE_ENV = "test";
const { app } = await import("../src/app.js");
const { prisma } = await import("../src/config/prisma.js");
const { default: cloudinary } = await import("../src/config/cloudinary.js");
const { crearToken } = await import("../src/auth/auth.tokens.js");
const { validarEstilos } = await import("../src/estilos/estilos.service.js");

type Row = Record<string, any>;
const usuarios = new Map<string, Row>();
const fotos = new Map<string, Row>();
const sesiones = new Map<string, Row>();
const eliminadas: string[] = [];
let subidas = 0;
let fallaEscritura = false;

function reemplazar(
  t: TestContext,
  objeto: object,
  nombre: string,
  metodo: unknown,
) {
  const row = objeto as Row;
  const anterior = row[nombre];
  row[nombre] = metodo;
  t.after(() => {
    row[nombre] = anterior;
  });
}
function coincide(row: Row, where: Row): boolean {
  return Object.entries(where).every(([campo, valor]) => {
    if (campo === "AND")
      return (Array.isArray(valor) ? valor : [valor]).every((condicion) =>
        coincide(row, condicion),
      );
    if (campo === "OR")
      return valor.some((condicion: Row) => coincide(row, condicion));
    if (campo === "galeria")
      return [...fotos.values()].some(
        (foto) => foto.usuarioId === row.id && coincide(foto, valor.some),
      );
    if (valor !== null && typeof valor === "object") {
      return Object.entries(valor).every(([operador, esperado]) => {
        if (operador === "not") return row[campo] !== esperado;
        if (operador === "notIn")
          return (
            row[campo] != null && !(esperado as unknown[]).includes(row[campo])
          );
        if (operador === "isEmpty")
          return (row[campo].length === 0) === esperado;
        if (operador === "hasSome")
          return (esperado as unknown[]).some((item) =>
            row[campo].includes(item),
          );
        if (operador === "equals")
          return (
            String(row[campo]).toLowerCase() === String(esperado).toLowerCase()
          );
        if (operador === "contains")
          return String(row[campo])
            .toLowerCase()
            .includes(String(esperado).toLowerCase());
        if (operador === "mode") return true;
        if (operador === "lte") return row[campo] <= Number(esperado);
        throw new Error(`Operador de prueba no contemplado: ${operador}`);
      });
    }
    return row[campo] === valor;
  });
}
function seleccionar(row: Row | undefined, select?: Row): Row | null {
  if (!row) return null;
  if (!select) return { ...row };
  return Object.fromEntries(
    Object.entries(select).map(([campo, regla]) => [
      campo,
      campo === "galeria"
        ? [...fotos.values()]
            .filter(
              (foto) =>
                foto.usuarioId === row.id && coincide(foto, regla.where),
            )
            .map((foto) => seleccionar(foto, regla.select))
        : row[campo],
    ]),
  );
}
beforeEach((t) => {
  usuarios.clear();
  fotos.clear();
  sesiones.clear();
  eliminadas.length = 0;
  subidas = 0;
  fallaEscritura = false;
  t.mock.method(console, "error", () => {});
  reemplazar(t, prisma.usuario, "findUnique", async ({ where, select }: Row) =>
    seleccionar(usuarios.get(where.id), select),
  );
  reemplazar(t, prisma.usuario, "findMany", async ({ where, select }: Row) =>
    [...usuarios.values()]
      .filter((row) => coincide(row, where))
      .map((row) => seleccionar(row, select)),
  );
  reemplazar(
    t,
    prisma.usuario,
    "update",
    async ({ where, data, select }: Row) => {
      if (fallaEscritura) throw new Error("fallo simulado");
      const row = usuarios.get(where.id)!;
      Object.assign(row, data);
      return seleccionar(row, select);
    },
  );
  reemplazar(
    t,
    prisma.sesion,
    "findUnique",
    async ({ where }: Row) => sesiones.get(where.id) ?? null,
  );
  reemplazar(t, prisma.fotoGaleria, "findMany", async ({ where }: Row) =>
    [...fotos.values()]
      .filter((row) => coincide(row, where))
      .map((row) => ({ ...row })),
  );
  reemplazar(t, prisma.fotoGaleria, "findFirst", async ({ where }: Row) =>
    seleccionar([...fotos.values()].find((row) => coincide(row, where))),
  );
  reemplazar(
    t,
    prisma.fotoGaleria,
    "count",
    async ({ where }: Row) =>
      [...fotos.values()].filter((row) => coincide(row, where)).length,
  );
  reemplazar(t, prisma.fotoGaleria, "create", async ({ data }: Row) => {
    if (fallaEscritura) throw new Error("fallo simulado");
    const row = {
      id: randomUUID(),
      publicId: null,
      esCicatrizado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    fotos.set(row.id, row);
    return { ...row };
  });
  reemplazar(
    t,
    prisma.fotoGaleria,
    "updateMany",
    async ({ where, data }: Row) => {
      if (fallaEscritura) throw new Error("fallo simulado");
      const row = [...fotos.values()].find((row) => coincide(row, where));
      if (!row) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    },
  );
  reemplazar(t, prisma.fotoGaleria, "deleteMany", async ({ where }: Row) => {
    let count = 0;
    for (const [id, row] of fotos)
      if (coincide(row, where)) {
        fotos.delete(id);
        count++;
      }
    return { count };
  });
  t.mock.method(cloudinary.uploader, "upload", async () => {
    subidas++;
    return {
      secure_url: `https://res.cloudinary.com/test/image/upload/qa-${subidas}.png`,
      public_id: `qa/${subidas}`,
    };
  });
  t.mock.method(cloudinary.uploader, "destroy", async (id: string) => {
    eliminadas.push(id);
    return { result: "ok" };
  });
});

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}/api`;
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=",
  "base64",
);
function cuenta(rol = "ARTISTA", completo = false) {
  const id = randomUUID();
  const sesion = randomUUID();
  const usuario = {
    id,
    rol,
    nombre: "Nombre privado",
    email: `${id}@example.invalid`,
    password: "hash-privado",
    googleId: "google-privado",
    dniPasaporte: "documento-privado",
    nombreArtistico: "Ana Ink",
    estudioId: null,
    biografia: completo ? "Biografía artística" : null,
    ciudad: completo ? "Rosario" : null,
    ciudadId: completo ? 1384 : null,
    pais: completo ? "AR" : null,
    fotoPerfil: completo ? "https://example.com/perfil.png" : null,
    fotoPublicId: null,
    estilosPrincipales: completo ? ["Blackwork"] : [],
    createdAt: new Date(),
    estadoVerificacion: "NO_VERIFICADO",
  };
  usuarios.set(id, usuario);
  sesiones.set(sesion, {
    id: sesion,
    usuarioId: id,
    revocadaAt: null,
    expiraAt: new Date(Date.now() + 3600000),
  });
  return { usuario, cookie: `inkmanager_session=${crearToken(id, sesion)}` };
}
function trabajo(usuarioId: string, estado = "BORRADOR") {
  const row = {
    id: randomUUID(),
    usuarioId,
    url: "https://example.com/tattoo.png",
    publicId: "foto/anterior",
    descripcion: "Tatuaje geométrico",
    estilos: ["Blackwork", "Geométrico"],
    estado,
    esCicatrizado: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  fotos.set(row.id, row);
  return row;
}
function request(path: string, cookie?: string, init: RequestInit = {}) {
  return fetch(base + path, {
    ...init,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...init.headers },
    signal: AbortSignal.timeout(10000),
  });
}
function json(path: string, method: string, body: unknown, cookie?: string) {
  return request(path, cookie, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function form(
  path: string,
  method: string,
  body: Row,
  cookie?: string,
  imagen = false,
) {
  const datos = new FormData();
  Object.entries(body).forEach(([key, value]) =>
    datos.set(
      key,
      Array.isArray(value) ? JSON.stringify(value) : String(value),
    ),
  );
  if (imagen)
    datos.set("imagen", new Blob([png], { type: "image/png" }), "tatuaje.png");
  return request(path, cookie, { method, body: datos });
}

test("catálogo común admite varios estilos, elimina duplicados y rechaza valores ajenos", async () => {
  const response = await request("/estilos");
  assert.equal(response.status, 200);
  const lista = await response.json();
  assert.ok(lista.includes("Blackwork"));
  assert.deepEqual(validarEstilos('["Blackwork","Blackwork","Realismo"]'), [
    "Blackwork",
    "Realismo",
  ]);
  for (const valor of ["no-json", {}, ["inventado"], [1], null])
    assert.throws(() => validarEstilos(valor));
});
test("panel exige sesión y rechaza clientes, administradores y superadmin", async () => {
  assert.equal((await request("/artistas/perfil")).status, 401);
  assert.equal(
    (await form("/trabajos", "POST", {}, undefined, true)).status,
    401,
  );
  for (const rol of ["CLIENTE", "ESTUDIO_ADMIN", "SUPERADMIN"]) {
    const { cookie } = cuenta(rol);
    assert.equal((await request("/trabajos", cookie)).status, 403);
    assert.equal(
      (await form("/artistas/perfil", "PUT", {}, cookie, true)).status,
      403,
    );
  }
  assert.equal(subidas, 0);
});
test("borrador admite campos incompletos y fuerza el propietario de la sesión", async () => {
  const { usuario, cookie } = cuenta();
  const ajeno = cuenta();
  const response = await json(
    "/trabajos",
    "POST",
    { usuarioId: ajeno.usuario.id },
    cookie,
  );
  assert.equal(response.status, 201);
  const row = await response.json();
  assert.equal(row.usuarioId, usuario.id);
  assert.equal(row.estado, "BORRADOR");
  assert.equal(row.url, "");
});
test("publicación valida foto, descripción y estilos antes de subir archivos", async () => {
  const { cookie } = cuenta();
  for (const body of [
    { descripcion: "", estilos: ["Blackwork"] },
    { descripcion: "Tatuaje", estilos: [] },
    { descripcion: "Tatuaje", estilos: ["inventado"] },
    { descripcion: "x".repeat(1201), estilos: ["Blackwork"] },
  ]) {
    assert.equal(
      (
        await form(
          "/trabajos",
          "POST",
          { ...body, estado: "PUBLICADO" },
          cookie,
          true,
        )
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await json(
        "/trabajos",
        "POST",
        { estado: "PUBLICADO", descripcion: "Tatuaje", estilos: ["Blackwork"] },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(subidas, 0);
});
test("artista publica una foto con varios estilos y vuelve a borrador", async () => {
  const { cookie } = cuenta();
  const response = await form(
    "/trabajos",
    "POST",
    {
      estado: "PUBLICADO",
      descripcion: "Tatuaje",
      estilos: ["Blackwork", "Realismo"],
    },
    cookie,
    true,
  );
  assert.equal(response.status, 201);
  const row = await response.json();
  assert.deepEqual(row.estilos, ["Blackwork", "Realismo"]);
  assert.equal(row.estado, "PUBLICADO");
  assert.equal(
    (await json(`/trabajos/${row.id}`, "PATCH", { estado: "BORRADOR" }, cookie))
      .status,
    200,
  );
  assert.equal(fotos.get(row.id)!.estado, "BORRADOR");
});
test("un artista no lista, edita ni elimina trabajos de otra cuenta", async () => {
  const propio = cuenta();
  const ajeno = cuenta();
  const foto = trabajo(ajeno.usuario.id);
  assert.deepEqual(
    await (await request("/trabajos", propio.cookie)).json(),
    [],
  );
  assert.equal(
    (
      await form(
        `/trabajos/${foto.id}`,
        "PATCH",
        { descripcion: "Ataque" },
        propio.cookie,
        true,
      )
    ).status,
    404,
  );
  assert.equal(
    (await request(`/trabajos/${foto.id}`, propio.cookie, { method: "DELETE" }))
      .status,
    404,
  );
  assert.equal(subidas, 0);
  assert.deepEqual(eliminadas, []);
  assert.ok(fotos.has(foto.id));
});
test("reemplazar y eliminar una foto solo limpia los recursos propios", async () => {
  const { usuario, cookie } = cuenta();
  const foto = trabajo(usuario.id);
  assert.equal(
    (
      await form(
        `/trabajos/${foto.id}`,
        "PATCH",
        { publicId: "foto/ajena", url: "https://ajeno.example" },
        cookie,
        true,
      )
    ).status,
    200,
  );
  assert.deepEqual(eliminadas, ["foto/anterior"]);
  assert.equal(
    (await request(`/trabajos/${foto.id}`, cookie, { method: "DELETE" }))
      .status,
    204,
  );
  assert.deepEqual(eliminadas, ["foto/anterior", "qa/1"]);
});
test("fallo de persistencia elimina el upload nuevo y conserva el anterior", async () => {
  const { usuario, cookie } = cuenta();
  const foto = trabajo(usuario.id);
  fallaEscritura = true;
  assert.equal(
    (await form(`/trabajos/${foto.id}`, "PATCH", {}, cookie, true)).status,
    500,
  );
  assert.deepEqual(eliminadas, ["qa/1"]);
  assert.equal(fotos.get(foto.id)!.publicId, "foto/anterior");
});
test("perfil actualiza únicamente campos permitidos y calcula la visibilidad", async () => {
  const { usuario, cookie } = cuenta();
  const response = await form(
    "/artistas/perfil",
    "PUT",
    {
      nombreArtistico: "Ana Ink",
      biografia: "Mi trabajo artístico",
      ciudadId: 1384,
      estilosPrincipales: ["Blackwork"],
      rol: "SUPERADMIN",
      email: "otro@example.com",
    },
    cookie,
    true,
  );
  assert.equal(response.status, 200);
  const perfil = await response.json();
  assert.equal(perfil.perfilCompleto, true);
  assert.equal(perfil.visibleEnCatalogo, false);
  assert.equal(usuario.rol, "ARTISTA");
  assert.notEqual(usuario.email, "otro@example.com");
  assert.equal(perfil.fotoPublicId, undefined);
  trabajo(usuario.id, "PUBLICADO");
  assert.equal(
    (await (await request("/artistas/perfil", cookie)).json())
      .visibleEnCatalogo,
    true,
  );
});
test("catálogo excluye borradores y perfiles incompletos y no expone datos privados", async () => {
  const publicado = cuenta("ARTISTA", true);
  const incompleto = cuenta();
  const sinPublicar = cuenta("ARTISTA", true);
  const visible = trabajo(publicado.usuario.id, "PUBLICADO");
  const oculto = trabajo(publicado.usuario.id);
  trabajo(incompleto.usuario.id, "PUBLICADO");
  trabajo(sinPublicar.usuario.id);
  const response = await request("/catalogo");
  assert.equal(response.status, 200);
  const datos = await response.json();
  assert.equal(datos.artistas.length, 1);
  assert.equal(datos.artistas[0].id, publicado.usuario.id);
  assert.deepEqual(
    datos.trabajos.map((foto: Row) => foto.id),
    [visible.id],
  );
  const texto = JSON.stringify(datos);
  for (const privado of [
    "hash-privado",
    "documento-privado",
    "google-privado",
    "Nombre privado",
    oculto.id,
    "foto/anterior",
    "example.invalid",
  ])
    assert.equal(texto.includes(privado), false);
  const filtrados = await (
    await request("/auth/filter-artists?estilos=Blackwork")
  ).json();
  assert.equal(filtrados.artistas.length, 1);
  assert.equal(JSON.stringify(filtrados).includes("hash-privado"), false);
});

test("biografía permite 300 caracteres y rechaza 301 sin modificar el perfil", async () => {
  const { usuario, cookie } = cuenta();
  const datos = {
    nombreArtistico: "Ana Ink",
    ciudadId: 1384,
    estilosPrincipales: ["Blackwork"],
    biografia: "a".repeat(300),
  };
  assert.equal(
    (await form("/artistas/perfil", "PUT", datos, cookie)).status,
    200,
  );
  const response = await form(
    "/artistas/perfil",
    "PUT",
    { ...datos, biografia: "a".repeat(301) },
    cookie,
  );
  assert.equal(response.status, 400);
  assert.equal(usuario.biografia.length, 300);
  assert.equal(subidas, 0);
});
test("contenido arbitrario, estados y firmas de imagen inválidos son rechazados", async () => {
  const { cookie } = cuenta();
  assert.equal(
    (await json("/trabajos", "POST", { estado: "CUALQUIERA" }, cookie)).status,
    400,
  );
  assert.equal(
    (await json("/trabajos/no-es-id", "PATCH", {}, cookie)).status,
    400,
  );
  const datos = new FormData();
  datos.set(
    "imagen",
    new Blob(["no es una imagen"], { type: "image/png" }),
    "falsa.png",
  );
  assert.equal(
    (await request("/trabajos", cookie, { method: "POST", body: datos }))
      .status,
    400,
  );
  assert.equal(subidas, 0);
});

test("ubicaciones públicas y perfil rechazan ciudades inventadas y provincias de otro país", async () => {
  const paises = await request("/ubicaciones/paises");
  assert.equal(paises.status, 200);
  assert.ok((await paises.json()).some((pais: Row) => pais.codigo === "AR"));
  const ciudades = await request(
    "/ubicaciones/ciudades?pais=AR&provincia=3641",
  );
  assert.equal(ciudades.status, 200);
  assert.ok((await ciudades.json()).some((ciudad: Row) => ciudad.id === 1384));
  assert.equal(
    (await request("/ubicaciones/ciudades?pais=CL&provincia=3641")).status,
    400,
  );
  assert.equal((await request("/ubicaciones/provincias?pais=XX")).status, 400);
  const { cookie } = cuenta();
  const datos = {
    nombreArtistico: "Ana Ink",
    biografia: "Mi trabajo",
    estilosPrincipales: ["Blackwork"],
  };
  assert.equal(
    (
      await form(
        "/artistas/perfil",
        "PUT",
        { ...datos, ciudad: "Ciudad inventada" },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await form(
        "/artistas/perfil",
        "PUT",
        { ...datos, ciudadId: 999999999 },
        cookie,
      )
    ).status,
    400,
  );
  const perfil = await form(
    "/artistas/perfil",
    "PUT",
    { ...datos, ciudadId: "1384", ciudad: "Inventada", pais: "CL" },
    cookie,
  );
  assert.equal(perfil.status, 200);
  const guardado = await perfil.json();
  assert.equal(guardado.ciudad, "Rosario");
  assert.equal(guardado.pais, "AR");
  assert.equal(guardado.provinciaId, 3641);
});
