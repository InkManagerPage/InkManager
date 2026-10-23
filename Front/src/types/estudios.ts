// interfaces Studio, Portfolio y Artist hechas por Gabriel Franco para la construccion del mock, se deben actualizar si la base de datos no coincide con el formato del mock

export interface Studio {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  instagram_handle: string;
  logo_url: string;
  created_at: string;
}

export interface PortfolioImage {
  id: string;
  artist_id: string;
  image_url: string;
  caption: string;
  style: string;
  is_featured: boolean; // Indica si destaca en el perfil del artista o página del estudio
  created_at: string;
}

export interface Artist {
  id: string;
  user_id?: string | null;
  full_name: string;
  stage_name: string;
  slug: string;
  bio: string;
  styles: string[];
  is_independent: boolean;
  primary_studio_id: string | null;
  city: string;
  instagram_handle: string;
  whatsapp_number: string;
  avatar_url: string;
  is_verified: boolean;
  created_at: string;
}
