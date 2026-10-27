export const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`, {
      credentials: 'include',
      ...options,
      signal: options.signal ?? AbortSignal.timeout(15000),
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('No pudimos conectar con InkManager. Intentá nuevamente.');
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'No pudimos completar la operación. Intentá nuevamente.';
    throw new ApiError(message, response.status);
  }
  return response;
}
