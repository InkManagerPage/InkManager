export interface Plan {
  id: 'INDIVIDUAL' | 'ESTUDIO';
  name: string;
  description: string;
  features: string[];
  precio?: PrecioPlan;
}

export interface PrecioPlan {
  id: Plan['id'];
  nombre: string;
  mensual: number;
  anual: number;
  moneda: string;
}
