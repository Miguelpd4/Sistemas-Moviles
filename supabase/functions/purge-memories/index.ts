// #34 · Borra las fotos del muro de recuerdos 7 días después de terminar cada viaje: el archivo
// del cubo privado `recuerdos` (con la API de Storage) y su fila en `memories`.
// La llama pg_cron cada hora (migración recuerdos). Solo borra lo que ya ha caducado, así que
// no necesita sesión: llamarla de más no hace ningún daño.
// Despliegue: npx supabase functions deploy purge-memories --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

const DAYS = 7;
const BATCH = 500;

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return Response.json({ error: 'Faltan las variables de Supabase' }, { status: 500 });
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const cutoff = new Date(Date.now() - DAYS * 24 * 3600 * 1000).toISOString();
  const { data, error } = await admin
    .from('memories')
    .select('id, photo_path, sessions!inner ( ended_at )')
    .lt('sessions.ended_at', cutoff)
    .limit(BATCH);
  if (error) {
    console.error('purge-memories: no se han podido leer los recuerdos', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) return Response.json({ deleted: 0 });

  const { error: removeError } = await admin.storage.from('recuerdos').remove(data.map((row) => row.photo_path));
  if (removeError) {
    console.error('purge-memories: no se han podido borrar los archivos', removeError);
    return Response.json({ error: removeError.message }, { status: 500 });
  }
  const { error: deleteError } = await admin.from('memories').delete().in('id', data.map((row) => row.id));
  if (deleteError) {
    console.error('purge-memories: no se han podido borrar las filas', deleteError);
    return Response.json({ error: deleteError.message }, { status: 500 });
  }
  console.log(`purge-memories: ${data.length} fotos caducadas borradas`);
  return Response.json({ deleted: data.length });
});
