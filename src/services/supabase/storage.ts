import { toAppError } from '@/lib/errors';

import { supabase } from './client';

export type PublicBucket = 'avatares' | 'coches';

function contentTypeFor(uri: string): { contentType: string; extension: string } {
  const lower = uri.toLowerCase();
  if (lower.includes('.png') || lower.startsWith('data:image/png')) return { contentType: 'image/png', extension: 'png' };
  if (lower.includes('.webp') || lower.startsWith('data:image/webp')) return { contentType: 'image/webp', extension: 'webp' };
  return { contentType: 'image/jpeg', extension: 'jpg' };
}

/**
 * Sube una imagen local (uri de expo-image-picker) a `<bucket>/<userId>/<marca de tiempo>.<ext>`
 * y devuelve la ruta dentro del cubo. Las políticas solo dejan escribir en la carpeta propia.
 */
export async function uploadImage(bucket: PublicBucket, userId: string, uri: string): Promise<string> {
  try {
    const { contentType, extension } = contentTypeFor(uri);
    // fetch(uri).arrayBuffer() funciona con archivos locales en Android y con blob: en la web.
    const body = await fetch(uri).then((response) => response.arrayBuffer());
    const path = `${userId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: false });
    if (error) throw error;
    return path;
  } catch (error) {
    throw toAppError(error, 'No se ha podido subir la imagen. Prueba con otra o vuelve a intentarlo.');
  }
}

/** URL pública de una imagen de un cubo público. */
export function publicUrl(bucket: PublicBucket, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
