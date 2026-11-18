import { useEffect, useState } from 'react';

/** El valor, pero solo cuando lleva `delayMs` sin cambiar (para no buscar en cada letra). */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
