-- #34 · Muro de fotos del viaje que caduca a los 7 días.
--
-- Cualquiera del coche sube fotos durante el viaje o después; solo las ven los que iban y
-- desaparecen 7 días después de que termine el viaje. Las fotos van a un cubo privado
-- `recuerdos/<viaje>/<usuario>/<foto>`. Cada hora, pg_cron llama a la Edge Function
-- purge-memories, que borra las fotos caducadas (archivo y fila) con la API de Storage.

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  photo_path text not null,
  caption text check (caption is null or char_length(caption) <= 140),
  created_at timestamptz not null default now()
);
create index memories_session_idx on public.memories (session_id, created_at desc);
create index memories_user_idx on public.memories (user_id);

-- ¿El muro de este viaje sigue abierto? Hasta 7 días después de terminar.
create function public.memories_open(p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sessions s
    where s.id = p_session_id and (s.ended_at is null or s.ended_at > now() - interval '7 days'));
$$;

alter table public.memories enable row level security;

create policy "ver recuerdos del viaje" on public.memories for select to authenticated
  using (public.is_member(session_id) and public.memories_open(session_id));
create policy "subir mi recuerdo" on public.memories for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_member(session_id)
    and public.memories_open(session_id)
    and split_part(photo_path, '/', 1) = session_id::text
    and split_part(photo_path, '/', 2) = (select auth.uid())::text
  );
create policy "borrar mi recuerdo" on public.memories for delete to authenticated
  using (user_id = (select auth.uid()));

-- Fotos: cubo privado de hasta 8 MB por foto, solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('recuerdos', 'recuerdos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

create policy "subir foto de recuerdo" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recuerdos'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and public.is_member(public.ticket_session(name))
    and public.memories_open(public.ticket_session(name))
  );
create policy "ver fotos de recuerdos" on storage.objects for select to authenticated
  using (
    bucket_id = 'recuerdos'
    and public.is_member(public.ticket_session(name))
    and public.memories_open(public.ticket_session(name))
  );
create policy "borrar mi foto de recuerdo" on storage.objects for delete to authenticated
  using (bucket_id = 'recuerdos' and split_part(name, '/', 2) = (select auth.uid())::text);

revoke execute on function public.memories_open(uuid) from public, anon;
grant execute on function public.memories_open(uuid) to authenticated;

-- Borrado automático cada hora (minuto 17) con la Edge Function purge-memories.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule(
  'copi-borrar-recuerdos',
  '17 * * * *',
  $$ select net.http_post(
       url := 'https://dytieuiyvrsejwvcvirh.supabase.co/functions/v1/purge-memories',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
