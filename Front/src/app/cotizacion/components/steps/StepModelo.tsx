import type { PasoCotizacionProps } from '@/types/cotizacion';
import { OpcionesConFoto } from '../OpcionesConFoto';

const opciones = [
  { valor: 'Mujer', foto: 'modelos-corporales/female/general-female' },
  { valor: 'Hombre', foto: 'modelos-corporales/male/general-male' },
];

export function StepModelo({ values, setFieldValue }: PasoCotizacionProps) {
  return (
    <OpcionesConFoto
      grupo="modelo"
      opciones={opciones}
      seleccion={values.generoLienzo}
      cuerpo
      onSelect={(genero) => {
        setFieldValue('generoLienzo', genero);
        setFieldValue('marcasZona', []);
      }}
    />
  );
}
