export interface Plan {
  id: 'INDIVIDUAL' | 'ESTUDIO';
  name: string;
  description: string;
  features: string[];
  price: number;
  annualPrice: number;
}
