import type { MarcaZona } from '@/types/cotizacion';

export type Punto = { x: number; y: number };
export type Medidas = { ancho: number; alto: number };
export type Edicion = 'mover' | 'rotar' | 'redimensionar';

const ladoMinimo = 8;
const ladoToque = 28;
const toleranciaToque = 4;

export function limitar(valor: number, minimo = 0, maximo = 1) {
  return Math.max(minimo, Math.min(maximo, valor));
}

export function marcaCentrada(punto: Punto, medidas: Medidas): MarcaZona {
  const ancho = Math.min(1, ladoToque / medidas.ancho);
  const alto = Math.min(1, ladoToque / medidas.alto);
  return {
    x: limitar(punto.x - ancho / 2, 0, 1 - ancho),
    y: limitar(punto.y - alto / 2, 0, 1 - alto),
    ancho,
    alto,
    rotacion: 0,
  };
}

export function dibujarMarca(inicio: Punto, fin: Punto, medidas: Medidas): MarcaZona {
  const dx = fin.x - inicio.x;
  const dy = fin.y - inicio.y;
  if (Math.hypot(dx * medidas.ancho, dy * medidas.alto) < toleranciaToque) {
    return marcaCentrada(inicio, medidas);
  }

  const ancho = limitar(Math.abs(dx), ladoMinimo / medidas.ancho);
  const alto = limitar(Math.abs(dy), ladoMinimo / medidas.alto);
  return {
    x: limitar(dx < 0 ? inicio.x - ancho : inicio.x, 0, 1 - ancho),
    y: limitar(dy < 0 ? inicio.y - alto : inicio.y, 0, 1 - alto),
    ancho,
    alto,
    rotacion: 0,
  };
}

function ajustar(marca: MarcaZona, medidas: Medidas): MarcaZona {
  const angulo = (marca.rotacion * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angulo));
  const sin = Math.abs(Math.sin(angulo));
  const aspecto = medidas.ancho / medidas.alto;
  const exteriorX = cos * marca.ancho + (sin * marca.alto) / aspecto;
  const exteriorY = sin * marca.ancho * aspecto + cos * marca.alto;
  const escala = Math.min(1, 1 / exteriorX, 1 / exteriorY);
  const mitadX = (exteriorX * escala) / 2;
  const mitadY = (exteriorY * escala) / 2;
  const ancho = marca.ancho * escala;
  const alto = marca.alto * escala;
  return {
    x: limitar(marca.x + marca.ancho / 2, mitadX, 1 - mitadX) - ancho / 2,
    y: limitar(marca.y + marca.alto / 2, mitadY, 1 - mitadY) - alto / 2,
    ancho,
    alto,
    rotacion: marca.rotacion,
  };
}

export function girarMarca(marca: MarcaZona, grados: number, medidas: Medidas) {
  const rotacion = ((((marca.rotacion + grados + 180) % 360) + 360) % 360) - 180;
  return ajustar({ ...marca, rotacion }, medidas);
}

export function editarMarca(
  marca: MarcaZona,
  accion: Edicion,
  inicio: Punto,
  fin: Punto,
  medidas: Medidas,
) {
  const dx = fin.x - inicio.x;
  const dy = fin.y - inicio.y;
  if (accion === 'mover') {
    return ajustar({ ...marca, x: marca.x + dx, y: marca.y + dy }, medidas);
  }

  const centro = { x: marca.x + marca.ancho / 2, y: marca.y + marca.alto / 2 };
  if (accion === 'rotar') {
    const angulo = (punto: Punto) =>
      Math.atan2((punto.y - centro.y) * medidas.alto, (punto.x - centro.x) * medidas.ancho);
    return girarMarca(marca, ((angulo(fin) - angulo(inicio)) * 180) / Math.PI, medidas);
  }

  // Proyectamos el arrastre sobre los ejes de la marca para conservar la esquina opuesta.
  const radianes = (marca.rotacion * Math.PI) / 180;
  const cos = Math.cos(radianes);
  const sin = Math.sin(radianes);
  const pixelesX = dx * medidas.ancho;
  const pixelesY = dy * medidas.alto;
  const ancho = limitar(
    marca.ancho + (pixelesX * cos + pixelesY * sin) / medidas.ancho,
    ladoMinimo / medidas.ancho,
  );
  const alto = limitar(
    marca.alto + (-pixelesX * sin + pixelesY * cos) / medidas.alto,
    ladoMinimo / medidas.alto,
  );
  const cambioX = ((ancho - marca.ancho) * medidas.ancho) / 2;
  const cambioY = ((alto - marca.alto) * medidas.alto) / 2;
  return ajustar(
    {
      ...marca,
      ancho,
      alto,
      x: centro.x + (cambioX * cos - cambioY * sin) / medidas.ancho - ancho / 2,
      y: centro.y + (cambioX * sin + cambioY * cos) / medidas.alto - alto / 2,
    },
    medidas,
  );
}
