import type { PasoCotizacionProps } from '@/types/cotizacion';
import { modeloCorporal } from '@/lib/ubicacion-tatuaje';
import { MarcaInteractiva } from '../MarcaInteractiva';

export function StepUbicacionArea({ values, setFieldValue }: PasoCotizacionProps) {
  const foto = modeloCorporal(values.generoLienzo, values.zonaCuerpo, values.zonaEspecifica);
  return (
    <MarcaInteractiva
      key={foto.src}
      foto={foto}
      zona={values.zonaEspecifica}
      marcas={values.marcasZona}
      onChange={(marcas) => setFieldValue('marcasZona', marcas)}
    />
  );
}
