// S1-09 · Búsqueda de canciones en Spotify para cualquier usuario de COPI (también anónimos).
// Usa el flujo Client Credentials: el secreto de Spotify solo vive aquí.
// Secretos: npx supabase secrets set SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=...
// Despliegue: npx supabase functions deploy spotify-search
import { isAuthenticated } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

type SpotifyImage = { url: string; width: number | null };
type SpotifyTrackItem = {
  id: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { images: SpotifyImage[] };
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) return cachedToken.value;

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error(`Token de Spotify: ${response.status}`);
  const body = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

/** La carátula más pequeña de al menos 64 px (o la que haya). */
function pickImage(images: SpotifyImage[]): string | null {
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((image) => (image.width ?? 0) >= 64) ?? sorted[0])?.url ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!(await isAuthenticated(req))) return json({ error: 'Inicia sesión para buscar canciones.' }, 401);

    const { q } = (await req.json().catch(() => ({}))) as { q?: unknown };
    const query = typeof q === 'string' ? q.trim().slice(0, 100) : '';
    if (query.length < 2) return json({ tracks: [] });

    const token = await getAppToken();
    const url = `https://api.spotify.com/v1/search?type=track&limit=10&market=ES&q=${encodeURIComponent(query)}`;
    let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      // Token caducado antes de lo previsto: se pide otro y se reintenta una vez.
      cachedToken = null;
      response = await fetch(url, { headers: { Authorization: `Bearer ${await getAppToken()}` } });
    }
    if (response.status === 429) return json({ error: 'Demasiadas búsquedas seguidas. Espera unos segundos.' }, 429);
    if (!response.ok) return json({ error: `Spotify ha respondido con un error (${response.status}).` }, 502);

    const body = (await response.json()) as { tracks?: { items?: SpotifyTrackItem[] } };
    const tracks = (body.tracks?.items ?? []).map((item) => ({
      id: item.id,
      title: item.name,
      artist: item.artists.map((artist) => artist.name).join(', '),
      albumArtUrl: pickImage(item.album.images),
      durationMs: item.duration_ms,
    }));
    return json({ tracks });
  } catch (error) {
    console.error('spotify-search', error);
    return json({ error: 'No se ha podido buscar en Spotify.' }, 500);
  }
});
