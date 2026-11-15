import { pickCarImage, searchQueries, wikiSearchUrl, type WikiPage } from '@/lib/carImage';

const TIMEOUT_MS = 6000;

async function search(lang: 'es' | 'en', query: string, make: string, model: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(wikiSearchUrl(lang, query), { signal: controller.signal });
    if (!response.ok) return null;
    const json = (await response.json()) as { query?: { pages?: Record<string, WikiPage> } };
    const pages = Object.values(json.query?.pages ?? {});
    return pickCarImage(pages, make, model);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Foto del modelo (Wikipedia, licencia libre). Prueba primero con la versión y en español,
 * después sin versión y en inglés. Devuelve null si no encuentra una foto fiable: la app
 * muestra entonces la silueta del coche con su color.
 */
export async function fetchCarModelImage(make: string, model: string, version?: string | null): Promise<string | null> {
  if (!make.trim() || !model.trim()) return null;
  for (const query of searchQueries(make, model, version)) {
    for (const lang of ['es', 'en'] as const) {
      const url = await search(lang, query, make, model);
      if (url) return url;
    }
  }
  return null;
}
