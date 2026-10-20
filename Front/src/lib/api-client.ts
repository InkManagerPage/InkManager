const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Base para las futuras llamadas al backend. La landing todavía no la utiliza.
// path es la ruta a consultar; options permite indicar método, cabeceras o datos.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  // Quitamos las barras de los extremos para no unir la URL con una doble barra.
  const baseUrl = apiUrl.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  const headers = new Headers(options.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(`${baseUrl}/${endpoint}`, { ...options, headers });

  if (!response.ok) {
    throw new Error(`La API respondió con el estado HTTP ${response.status}.`);
  }

  return response;
}
