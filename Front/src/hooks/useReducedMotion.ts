import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  // Si la persona cambia su preferencia, React vuelve a leer el valor.
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia(query).matches;
}

export function useReducedMotion() {
  // Lee una preferencia del navegador. En el servidor usamos true para empezar sin animación.
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
