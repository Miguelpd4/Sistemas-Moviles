import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * true si la petición trae el JWT de un usuario de Supabase (anónimos incluidos).
 * La clave para preguntar a Auth es la que manda la propia app (cabecera apikey, la clave
 * publicable); si no viene, la del entorno de la función.
 */
export async function isAuthenticated(req: Request): Promise<boolean> {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return false;
  const key = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser();
  return !error && data.user !== null;
}
