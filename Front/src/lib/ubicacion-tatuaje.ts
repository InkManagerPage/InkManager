import type { MarcaZona } from '@/types/cotizacion';

const dimensiones: Record<'female' | 'male', Record<string, [number, number]>> = {
  female: {
    armInnerFace: [576, 1200],
    armOuterFace: [569, 1200],
    faceBack: [900, 1103],
    faceFront: [900, 1058],
    faceSide: [900, 1125],
    handInnerFace: [900, 1200],
    handOuterFace: [900, 1200],
    legBackFace: [482, 1200],
    legsFrontFace: [482, 1200],
    legSideFace: [548, 1200],
    torsoBackFace: [789, 990],
    torsoFrontFace: [881, 1125],
    torsoRibs: [677, 1171],
  },
  male: {
    armInnerFace: [552, 1200],
    armOuterFace: [390, 1108],
    faceBack: [900, 1022],
    faceFront: [900, 1093],
    faceSide: [900, 999],
    handInnerFace: [900, 1200],
    handOuterFace: [900, 1200],
    legBackFace: [567, 1200],
    legsFrontFace: [535, 1200],
    legOuterFace: [602, 1200],
    torsoBackFace: [774, 947],
    torsoFrontFace: [792, 1067],
    torsoRibs: [594, 1200],
  },
};

export const zonasCorporales: Record<string, Record<string, string>> = {
  Brazo: {
    'Parte interna': 'armInnerFace',
    'Parte externa': 'armOuterFace',
    'Manga completa': 'armOuterFace',
  },
  Mano: { Palma: 'handInnerFace', 'Dorso / Dedos': 'handOuterFace' },
  Torso: { Costillas: 'torsoRibs', Espalda: 'torsoBackFace', 'Pecho / Abdomen': 'torsoFrontFace' },
  Pierna: {
    'Parte delantera': 'legsFrontFace',
    'Parte trasera / Gemelos': 'legBackFace',
    'Parte externa': 'legLateral',
  },
  'Cabeza / Cuello': {
    'Nuca / Parte trasera': 'faceBack',
    'Lateral / Perfil': 'faceSide',
    'Rostro / Cuello frontal': 'faceFront',
  },
};

export const maximoMarcas = 3;
export const bordeMarca = '#75e0f2';
export const rellenoMarca = 'rgba(55, 190, 217, 0.22)';

export function modeloCorporal(genero: string, zona: string, subzona: string) {
  const modelo = genero === 'Mujer' ? 'female' : 'male';
  const vista = zonasCorporales[zona]?.[subzona];
  const archivo =
    vista === 'legLateral' ? (modelo === 'female' ? 'legSideFace' : 'legOuterFace') : vista;
  const medidas = archivo ? dimensiones[modelo][archivo] : undefined;
  if (!medidas) throw new Error('Volvé al paso anterior y elegí la zona del tatuaje.');
  return {
    src: `/images/modelos-corporales/${modelo}/${archivo}-${modelo}.jpg`,
    ancho: medidas[0],
    alto: medidas[1],
  };
}

export async function exportarZonaMarcada(src: string, marcas: MarcaZona[]): Promise<File> {
  const imagen = new Image();
  imagen.src = src;
  try {
    await imagen.decode();
  } catch {
    throw new Error(
      'No pudimos cargar la foto de la zona marcada. Intentá enviar la consulta otra vez.',
    );
  }

  const canvas = document.createElement('canvas');
  const ancho = imagen.naturalWidth;
  const alto = imagen.naturalHeight;
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No pudimos preparar la foto de la zona marcada.');
  ctx.drawImage(imagen, 0, 0);
  ctx.fillStyle = rellenoMarca;
  ctx.strokeStyle = bordeMarca;
  ctx.lineWidth = Math.max(4, ancho / 130);
  for (const m of marcas) {
    const anchoMarca = m.ancho * ancho;
    const altoMarca = m.alto * alto;
    ctx.save();
    ctx.translate(m.x * ancho + anchoMarca / 2, m.y * alto + altoMarca / 2);
    ctx.rotate((m.rotacion * Math.PI) / 180);
    ctx.fillRect(-anchoMarca / 2, -altoMarca / 2, anchoMarca, altoMarca);
    ctx.strokeRect(-anchoMarca / 2, -altoMarca / 2, anchoMarca, altoMarca);
    ctx.restore();
  }

  const foto = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.88),
  );
  if (!foto) throw new Error('No pudimos guardar la foto de la zona marcada.');
  return new File([foto], 'zona-marcada.jpg', { type: 'image/jpeg' });
}
