import type { MarcaZona } from '@/types/cotizacion';

export type Punto = { x: number; y: number };
export type Medidas = { ancho: number; alto: number };
export type Edicion = 'mover' | 'rotar' | 'redimensionar';

export function limitar(valor: number, minimo = 0, maximo = 1) {
  return Math.max(minimo, Math.min(maximo, valor));
}

export function marcaCentrada(punto: Punto): MarcaZona {
  const lado = 0.18;
  return {
    x: limitar(punto.x - lado / 2, 0, 1 - lado),
    y: limitar(punto.y - lado / 2, 0, 1 - lado),
    ancho: lado,
    alto: lado,
    rotacion: 0,
  };
}

export function rectangulo(inicio: Punto, fin: Punto): MarcaZona {
  return {
    x: Math.min(inicio.x, fin.x),
    y: Math.min(inicio.y, fin.y),
    ancho: Math.abs(inicio.x - fin.x),
    alto: Math.abs(inicio.y - fin.y),
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
  const ancho = limitar(marca.ancho + (pixelesX * cos + pixelesY * sin) / medidas.ancho, 0.08);
  const alto = limitar(marca.alto + (-pixelesX * sin + pixelesY * cos) / medidas.alto, 0.08);
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
