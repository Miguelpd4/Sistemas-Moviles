import { toAppError } from '@/lib/errors';

import { supabase } from './client';

/**
 * Muro de recuerdos (#34): fotos de un viaje en el cubo privado `recuerdos/<viaje>/<usuario>/…`.
 * RLS solo deja ver las de mis viajes y mientras no hayan caducado (7 días tras el final).
 */
export type Memory = {
  id: string;
  sessionId: string;
  userId: string;
  path: string;
  caption: string | null;
  createdAt: string;
  /** Enlace temporal (1 h) para ver la foto. */
  url: string | null;
  /** Del viaje: para «Tus recuerdos» en el Perfil. */
  endedAt: string | null;
  carName: string | null;
};

type Row = {
  id: string;
  session_id: string;
  user_id: string;
  photo_path: string;
  caption: string | null;
  created_at: string;
  sessions: { ended_at: string | null; cars: { name: string } | null } | null;
};

const SELECT = 'id, session_id, user_id, photo_path, caption, created_at, sessions ( ended_at, cars ( name ) )';

async function withUrls(rows: readonly Row[]): Promise<Memory[]> {
  if (rows.length === 0) return [];
  const { data } = await supabase.storage.from('recuerdos').createSignedUrls(
    rows.map((row) => row.photo_path),
    3600,
  );
  const urls = new Map((data ?? []).map((item) => [item.path, item.signedUrl]));
  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    path: row.photo_path,
    caption: row.caption,
    createdAt: row.created_at,
    url: urls.get(row.photo_path) ?? null,
    endedAt: row.sessions?.ended_at ?? null,
    carName: row.sessions?.cars?.name ?? null,
  }));
}

/** Las fotos de un viaje, de la más nueva a la más antigua. */
export async function getMemories(sessionId: string): Promise<Memory[]> {
  const { data, error } = await supabase.from('memories').select(SELECT).eq('session_id', sessionId).order('created_at', { ascending: false });
  if (error) throw toAppError(error, 'No se han podido cargar las fotos del viaje.');
  return withUrls(data as Row[]);
}

/** Todas las fotos que aún se ven de todos mis viajes (para el Perfil). */
export async function getAllMyMemories(): Promise<Memory[]> {
  const { data, error } = await supabase.from('memories').select(SELECT).order('created_at', { ascending: false }).limit(60);
  if (error) throw toAppError(error, 'No se han podido cargar tus recuerdos.');
  return withUrls(data as Row[]);
}

function contentTypeFor(uri: string): { contentType: string; extension: string } {
  const lower = uri.toLowerCase();
  if (lower.includes('.png') || lower.startsWith('data:image/png')) return { contentType: 'image/png', extension: 'png' };
  if (lower.includes('.webp') || lower.startsWith('data:image/webp')) return { contentType: 'image/webp', extension: 'webp' };
  return { contentType: 'image/jpeg', extension: 'jpg' };
}

/** Sube una foto (uri de expo-image-picker) al muro del viaje. */
export async function addMemory(sessionId: string, userId: string, uri: string, caption: string | null): Promise<void> {
  const { contentType, extension } = contentTypeFor(uri);
  const path = `${sessionId}/${userId}/${Date.now()}.${extension}`;
  try {
    const body = await fetch(uri).then((response) => response.arrayBuffer());
    const { error } = await supabase.storage.from('recuerdos').upload(path, body, { contentType, upsert: false });
    if (error) throw error;
  } catch (error) {
    throw toAppError(error, 'No se ha podido subir la foto. Prueba con otra o vuelve a intentarlo.');
  }
  const text = caption?.trim() ? caption.trim().slice(0, 140) : null;
  const { error } = await supabase.from('memories').insert({ session_id: sessionId, user_id: userId, photo_path: path, caption: text });
  if (error) {
    await supabase.storage.from('recuerdos').remove([path]);
    throw toAppError(error, 'No se ha podido guardar la foto en el muro.');
  }
}

/** Borra una foto mía (archivo y fila). */
export async function removeMemory(memory: Pick<Memory, 'id' | 'path'>): Promise<void> {
  const { error } = await supabase.from('memories').delete().eq('id', memory.id);
  if (error) throw toAppError(error, 'No se ha podido borrar la foto.');
  await supabase.storage.from('recuerdos').remove([memory.path]);
}
