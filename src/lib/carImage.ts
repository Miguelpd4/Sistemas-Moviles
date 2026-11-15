/**
 * Foto del modelo de coche sacada de Wikipedia (fotos con licencia libre).
 * Lógica pura: construir la URL de búsqueda y elegir el mejor resultado. La llamada de red
 * está en src/services/carImage.ts.
 */
import { normalizeText } from './carCatalog';

export type WikiPage = {
  index?: number;
  title?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
};

/** URL de la API de Wikipedia que busca el artículo del modelo y devuelve su imagen principal. */
export function wikiSearchUrl(lang: 'es' | 'en', query: string): string {
  const params = [
    'action=query',
    'format=json',
    'origin=*',
    'generator=search',
    `gsrsearch=${encodeURIComponent(query)}`,
    'gsrnamespace=0',
    'gsrlimit=6',
    'prop=pageimages',
    'piprop=thumbnail',
    'pithumbsize=800',
  ];
  return `https://${lang}.wikipedia.org/w/api.php?${params.join('&')}`;
}

/** Textos de búsqueda, del más concreto al más general: con versión y sin ella. */
export function searchQueries(make: string, model: string, version?: string | null): string[] {
  const base = `${make.trim()} ${model.trim()}`.trim();
  const withVersion = version?.trim() ? `${base} ${version.trim()}` : null;
  return withVersion ? [withVersion, base] : [base];
}

/**
 * De los resultados, el primero (por relevancia) que tiene foto y cuyo título contiene la marca
 * y el modelo. Así se evita, por ejemplo, la foto de una carrera o de una fábrica.
 */
export function pickCarImage(pages: readonly WikiPage[], make: string, model: string): string | null {
  const makeKey = normalizeText(make).replace(/-/g, ' ');
  const modelKey = normalizeText(model).replace(/-/g, ' ');
  const sorted = [...pages].sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const page of sorted) {
    const source = page.thumbnail?.source;
    if (!source || !source.startsWith('https://')) continue;
    if (/\.svg/i.test(source) || /logo/i.test(source)) continue;
    const title = normalizeText(page.title ?? '').replace(/-/g, ' ');
    // «SEAT León» frente a «Seat Leon», «Mercedes-Benz Clase A» frente a «Mercedes Clase A»…
    const makeFirstWord = makeKey.split(' ')[0] ?? makeKey;
    if (title.includes(modelKey) && title.includes(makeFirstWord)) return source;
  }
  return null;
}
