'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function usePanelFilters() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  function update(values: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    const url = `${pathname}${query ? `?${query}` : ''}`;
    if (url === `${pathname}${params.size ? `?${params}` : ''}`) return;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }
  return { params, update };
}
