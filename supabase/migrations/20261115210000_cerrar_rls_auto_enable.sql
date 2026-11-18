-- La opción «Enable automatic RLS» del panel crea la función public.rls_auto_enable(), que
-- queda expuesta como RPC a cualquiera (aviso del Security Advisor). Solo la usa un
-- disparador de eventos, que se ejecuta como su dueño, así que se quita el permiso a los
-- roles de la API. Si la función no existe (Supabase local), no se hace nada.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
