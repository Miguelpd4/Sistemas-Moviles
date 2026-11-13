-- S1-02 · Tablas del núcleo, funciones auxiliares, RLS, Realtime y Storage.

-- Tablas -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 30),
  avatar_kind text not null default 'preset' check (avatar_kind in ('preset', 'foto')),
  avatar_value text not null default 'avatar-01',
  is_anonymous boolean not null default true,
  phone text check (phone ~ '^\+?[0-9]{9,15}$'),
  paypal_username text check (paypal_username ~ '^[A-Za-z0-9]{1,20}$'),
  created_at timestamptz not null default now()
);

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  photo_path text,
  nfc_code text not null unique check (nfc_code ~ '^[A-Z0-9]{4,12}$'),
  consumption_l_100km numeric(4,1) not null check (consumption_l_100km > 0 and consumption_l_100km <= 30),
  fuel_type text not null check (fuel_type in ('gasolina_95', 'gasolina_98', 'diesel', 'glp')),
  seats smallint not null default 5 check (seats between 2 and 9),
  created_at timestamptz not null default now()
);
create index cars_por_dueno on public.cars (owner_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'abierta' check (status in ('abierta', 'en_curso', 'finalizada')),
  join_mode text not null default 'libre' check (join_mode in ('libre', 'aprobacion')),
  consumption_l_100km numeric(4,1) not null,
  fuel_price_eur_l numeric(5,3),
  destination_name text,
  destination_lat double precision,
  destination_lon double precision,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index sessions_una_abierta_por_coche on public.sessions (car_id) where status <> 'finalizada';
create index sessions_por_conductor on public.sessions (host_id);

create table public.session_members (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'pasajero' check (role in ('conductor', 'copiloto', 'pasajero')),
  status text not null default 'dentro' check (status in ('pendiente', 'dentro', 'rechazado', 'fuera')),
  seat smallint check (seat between 1 and 9),
  display_name text not null check (char_length(display_name) between 1 and 30),
  avatar_kind text not null default 'preset' check (avatar_kind in ('preset', 'foto')),
  avatar_value text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (session_id, user_id)
);
create unique index session_members_asiento_ocupado on public.session_members (session_id, seat)
  where seat is not null and status in ('pendiente', 'dentro');
create index session_members_por_usuario on public.session_members (user_id);

-- Perfil automático para cada usuario nuevo (anónimo o con email) ----------
-- El conductor manda su nombre en los metadatos del registro (display_name).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, is_anonymous, display_name)
  values (
    new.id,
    coalesce(new.is_anonymous, false),
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 30)
  );
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funciones auxiliares -----------------------------------------------------
create function public.is_member(p_session_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.session_members m
    where m.session_id = p_session_id and m.user_id = (select auth.uid()) and m.status = 'dentro');
$$;

create function public.is_admin(p_session_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.session_members m
    where m.session_id = p_session_id and m.user_id = (select auth.uid())
      and m.status = 'dentro' and m.role in ('conductor', 'copiloto'));
$$;

create function public.is_host(p_session_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sessions s where s.id = p_session_id and s.host_id = (select auth.uid()));
$$;

-- ¿El usuario actual comparte algún viaje con p_user_id? (para ver su perfil)
create function public.shares_session(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.session_members a
    join public.session_members b on b.session_id = a.session_id
    where a.user_id = (select auth.uid()) and a.status = 'dentro' and b.user_id = p_user_id);
$$;

-- RLS ----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cars enable row level security;
alter table public.sessions enable row level security;
alter table public.session_members enable row level security;

create policy "ver perfil propio o de compañeros" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_session(id));
create policy "editar perfil propio" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "ver coche propio o del viaje" on public.cars for select to authenticated
  using (owner_id = (select auth.uid())
    or exists (select 1 from public.sessions s where s.car_id = cars.id and public.is_member(s.id)));
-- Solo usuarios con email (no anónimos) gestionan coches
create policy "gestionar coche propio" on public.cars for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid())
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "ver viajes propios" on public.sessions for select to authenticated
  using (host_id = (select auth.uid()) or public.is_member(id));

create policy "ver miembros del viaje o mi fila" on public.session_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_member(session_id));
-- Sin políticas de insert/update/delete en sessions y session_members: solo las RPC escriben.

-- Las funciones auxiliares solo se usan dentro de políticas y RPC
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.is_host(uuid) from public, anon;
revoke execute on function public.shares_session(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_host(uuid) to authenticated;
grant execute on function public.shares_session(uuid) to authenticated;

-- Realtime -----------------------------------------------------------------
alter publication supabase_realtime add table public.sessions, public.session_members;

-- Storage ------------------------------------------------------------------
-- Avatares y fotos de coche: lectura pública (no son datos sensibles), escritura en la carpeta propia.
insert into storage.buckets (id, name, public) values
  ('avatares', 'avatares', true), ('coches', 'coches', true)
on conflict (id) do nothing;

create policy "subir a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatares', 'coches')
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "cambiar lo mío" on storage.objects for update to authenticated
  using (bucket_id in ('avatares', 'coches') and owner_id = (select auth.uid())::text);
