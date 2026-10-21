import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test, type TestContext } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import cloudinary from '../src/config/cloudinary.js';

let server: Server;
let baseUrl: string;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// Prisma usa un proxy; reemplazamos sus métodos solo durante cada prueba.
function simularConsulta(t: TestContext, metodo: string, respuesta: (...args: any[]) => any) {
  const usuario = prisma.usuario as unknown as Record<string, (...args: any[]) => any>;
  const original = usuario[metodo];
  const consulta = t.mock.fn(respuesta);
  usuario[metodo] = consulta;
  t.after(() => {
    usuario[metodo] = original;
  });
  return consulta;
}

function registrar(body: object) {
  return fetch(`${baseUrl}/api/auth/register-artist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('health conserva su respuesta', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    message: 'Backend InkManager corriendo correctamente',
  });
});

test('reseñas devuelve el formato que consume la landing', async (t) => {
  simularConsulta(t, 'findMany', async () => [
    {
      id: 'artista-1',
      nombre: 'Ana',
      fotoPerfil: 'https://example.com/ana.jpg',
      resena: 'Muy útil',
    },
  ]);
  const response = await fetch(`${baseUrl}/api/resenas`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    { id: 'artista-1', nombre: 'Ana', fotoUrl: 'https://example.com/ana.jpg', resena: 'Muy útil' },
  ]);
});

test('reseñas responde 503 si falla la base', async (t) => {
  simularConsulta(t, 'findMany', async () => {
    throw new Error('Fallo simulado');
  });
  t.mock.method(console, 'error', () => {});
  const response = await fetch(`${baseUrl}/api/resenas`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'No pudimos cargar las reseñas en este momento.',
  });
});

test('registro rechaza campos obligatorios faltantes sin consultar la base', async (t) => {
  const consulta = simularConsulta(t, 'findUnique', () => {
    throw new Error('No debería consultar la base');
  });
  const response = await registrar({ email: 'ana@example.com' });
  assert.equal(response.status, 400);
  assert.equal(consulta.mock.callCount(), 0);
});

test('registro rechaza emails ya registrados', async (t) => {
  simularConsulta(t, 'findUnique', async () => ({ id: 'existente' }));
  const response = await registrar({
    email: 'ana@example.com',
    password: 'clave-de-prueba',
    nombre: 'Ana',
    nombreArtistico: 'Ana Ink',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'El correo electrónico ya está registrado.' });
});

test('registro guarda un hash y devuelve solo los datos públicos', async (t) => {
  simularConsulta(t, 'findUnique', async () => null);
  simularConsulta(t, 'create', async (args) => {
    assert.equal(args.data.rol, 'ARTISTA');
    assert.equal(await bcrypt.compare('clave-de-prueba', args.data.password), true);
    assert.match(args.data.tokenVerificacionEmail, /^[a-f0-9]{64}$/);
    assert.equal(args.select.password, undefined);
    assert.equal(args.select.tokenVerificacionEmail, undefined);
    return { id: 'nuevo', nombre: args.data.nombre, rol: args.data.rol };
  });
  const response = await registrar({
    email: 'ana@example.com',
    password: 'clave-de-prueba',
    nombre: 'Ana',
    nombreArtistico: 'Ana Ink',
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    message: 'Artista registrado con éxito.',
    user: { id: 'nuevo', nombre: 'Ana', rol: 'ARTISTA' },
  });
});

test('verificación rechaza tokens ausentes e inexistentes', async (t) => {
  simularConsulta(t, 'findFirst', async () => null);
  assert.equal((await fetch(`${baseUrl}/api/auth/verify-email`)).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/auth/verify-email?token=invalido`)).status, 404);
});

test('verificación marca el email y elimina el token usado', async (t) => {
  simularConsulta(t, 'findFirst', async () => ({ id: 'artista-1' }));
  const actualizar = simularConsulta(t, 'update', async (args) => {
    assert.equal(args.where.id, 'artista-1');
    assert.deepEqual(args.data, { emailVerificado: true, tokenVerificacionEmail: null });
    return { id: 'artista-1' };
  });
  const response = await fetch(`${baseUrl}/api/auth/verify-email?token=token-de-prueba`);
  assert.equal(response.status, 200);
  assert.equal(actualizar.mock.callCount(), 1);
});

test('upload rechaza peticiones sin archivo', async () => {
  const response = await fetch(`${baseUrl}/api/upload`, { method: 'POST' });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'No se envió ninguna imagen' });
});

test('upload procesa el campo imagen y conserva su respuesta', async (t) => {
  t.mock.method(cloudinary.uploader, 'upload', async (dataUri, options) => {
    assert.equal(dataUri, 'data:image/png;base64,aW1hZ2Vu');
    assert.equal(options.folder, 'inkmanager/referencias');
    return { secure_url: 'https://example.com/imagen.png', public_id: 'referencia-1' };
  });
  const form = new FormData();
  form.append('imagen', new Blob(['imagen'], { type: 'image/png' }), 'referencia.png');
  const response = await fetch(`${baseUrl}/api/upload`, { method: 'POST', body: form });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    message: 'Imagen subida exitosamente a Cloudinary',
    url: 'https://example.com/imagen.png',
    public_id: 'referencia-1',
  });
});

test('las rutas nuevas de autenticación todavía no están implementadas', async () => {
  for (const [method, path] of [
    ['POST', '/register'],
    ['POST', '/login'],
    ['GET', '/me'],
    ['POST', '/logout'],
  ]) {
    const response = await fetch(`${baseUrl}/api/auth${path}`, { method });
    assert.equal(response.status, 404);
  }
});
