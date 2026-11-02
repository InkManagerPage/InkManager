import type { CicloPlan } from '../types/suscripcion';

export const precioIndividual = (ciclo: CicloPlan) => (ciclo === 'ANUAL' ? 120000 : 12000);
export const nombreCiclo = (ciclo: CicloPlan) => (ciclo === 'ANUAL' ? 'Anual' : 'Mensual');
