export type { TokenCuenta, TipoTokenCuenta } from "@prisma/client";
export interface DestinatarioCuenta {
  id: string;
  email: string;
  nombre: string | null;
}
