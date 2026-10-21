import { useEffect, useState } from 'react';
import { getReviews } from '@/services/reviews.service';
import type { Review } from '@/types/review';

export function useReviews() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    // Cancelamos la petición si la persona abandona la página.
    getReviews(controller.signal)
      .then(setReviews)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });

    return () => controller.abort();
  }, []);

  return { reviews, error };
}
