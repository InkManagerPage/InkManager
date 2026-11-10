import type { PasoCotizacionProps } from '@/types/cotizacion';
import { OpcionesConFoto } from '../OpcionesConFoto';

const opciones = [
  { valor: 'color', etiqueta: 'A color', foto: 'cotizacion/color/color' },
  { valor: 'gris', etiqueta: 'Negro y gris', foto: 'cotizacion/color/blackGrey' },
];

export function StepColor({ values, setFieldValue }: PasoCotizacionProps) {
  return (
    <OpcionesConFoto
      grupo="color"
      opciones={opciones}
      seleccion={values.esColor === null ? '' : values.esColor ? 'color' : 'gris'}
      onSelect={(valor) => {
        setFieldValue('esColor', valor === 'color');
      }}
    />
  );
}
