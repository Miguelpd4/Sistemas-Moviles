import { createClient } from 'npm:@supabase/supabase-js@2';

/** true si la petición trae el JWT de un usuario de Supabase (anónimos incluidos). */
export async function isAuthenticated(req: Request): Promise<boolean> {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return false;
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser();
  return !error && data.user !== null;
}
