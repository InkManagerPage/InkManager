import type { PasoCotizacionProps } from '@/types/cotizacion';
import { modeloCorporal } from '@/lib/ubicacion-tatuaje';
import { OpcionesConFoto } from '../OpcionesConFoto';

const vistas = {
  Brazo: 'Parte externa',
  Mano: 'Dorso / Dedos',
  Torso: 'Pecho / Abdomen',
  Pierna: 'Parte delantera',
  'Cabeza / Cuello': 'Rostro / Cuello frontal',
};

export function StepZonaGeneral({ values, setFieldValue }: PasoCotizacionProps) {
  const opciones = Object.entries(vistas).map(([valor, subzona]) => ({
    valor,
    foto: modeloCorporal(values.generoLienzo, valor, subzona).src,
  }));
  return (
    <OpcionesConFoto
      grupo="zona"
      opciones={opciones}
      seleccion={values.zonaCuerpo}
      cuerpo
      onSelect={(zona) => {
        setFieldValue('zonaCuerpo', zona);
        setFieldValue('zonaEspecifica', '');
        setFieldValue('marcasZona', []);
      }}
    />
  );
}
