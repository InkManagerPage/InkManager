// Las reseñas actuales se obtienen de los perfiles de artistas.
export interface Resena {
  id: string;
  nombre: string | null;
  fotoUrl: string | null;
  resena: string | null;
}
