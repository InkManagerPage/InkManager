import type { CanalConsulta, ConsultaPanel } from '../types/panel-artista';

export const canalesConsulta: { id: CanalConsulta; nombre: string; abreviatura: string }[] = [
  { id: 'INSTAGRAM', nombre: 'Instagram', abreviatura: 'IG' },
  { id: 'WHATSAPP', nombre: 'WhatsApp', abreviatura: 'WA' },
  { id: 'TIKTOK', nombre: 'TikTok', abreviatura: 'TK' },
  { id: 'FACEBOOK', nombre: 'Facebook', abreviatura: 'FB' },
  { id: 'WEB', nombre: 'Formulario web', abreviatura: 'IM' },
];
export function nombreCanal(canal: CanalConsulta) {
  return canalesConsulta.find((item) => item.id === canal)?.nombre || 'Sin registrar';
}
export function contarCanales(consultas: ConsultaPanel[]) {
  return canalesConsulta
    .filter((canal) => canal.id !== 'WEB' || consultas.some((consulta) => consulta.canal === 'WEB'))
    .map((canal) => ({
      ...canal,
      cantidad: consultas.filter((consulta) => consulta.canal === canal.id).length,
    }));
}
