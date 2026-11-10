import type { PasoCotizacionProps } from '@/types/cotizacion';
import { modeloCorporal, zonasCorporales } from '@/lib/ubicacion-tatuaje';
import { OpcionesConFoto } from '../OpcionesConFoto';

export function StepZonaEspecifica({ values, setFieldValue }: PasoCotizacionProps) {
  const opciones = Object.keys(zonasCorporales[values.zonaCuerpo] ?? {}).map((valor) => ({
    valor,
    foto: modeloCorporal(values.generoLienzo, values.zonaCuerpo, valor).src,
  }));
  return (
    <OpcionesConFoto
      grupo="subzona"
      opciones={opciones}
      seleccion={values.zonaEspecifica}
      cuerpo
      onSelect={(subzona) => {
        setFieldValue('zonaEspecifica', subzona);
        setFieldValue('marcasZona', []);
      }}
    />
  );
}
