import { apiFetch } from '@/lib/api-client';
import type { Review } from '@/types/review';

export async function getReviews(signal: AbortSignal): Promise<Review[]> {
  const response = await apiFetch('/resenas', { signal });
  return response.json();
}
