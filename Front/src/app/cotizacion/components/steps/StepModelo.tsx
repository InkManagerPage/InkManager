import type { PasoCotizacionProps } from '@/types/cotizacion';
import { OpcionesConFoto } from '../OpcionesConFoto';

const opciones = [
  { valor: 'Mujer', foto: '/images/modelos-corporales/female/general-female.jpg' },
  { valor: 'Hombre', foto: '/images/modelos-corporales/male/general-male.jpg' },
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
