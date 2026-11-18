-- S2-01 · Migración 0002 (2 de 2): gestión de la sala, música, viaje y canales privados de Realtime.
-- Va después de «juegos» porque end_trip cierra las rondas de juego.

-- Gestión de la sala ---------------------------------------------------------
create function public.review_join(p_session_id uuid, p_user_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(p_session_id) then raise exception 'NOT_ADMIN'; end if;
  update public.session_members
    set status = case when p_accept then 'dentro' else 'rechazado' end,
        seat = case when p_accept then seat else null end
    where session_id = p_session_id and user_id = p_user_id and status = 'pendiente';
  if not found then raise exception 'NOT_PENDING'; end if;
end; $$;

-- p_user_id null = quitar el copiloto actual
create function public.set_copilot(p_session_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_host(p_session_id) then raise exception 'NOT_HOST'; end if;
  update public.session_members set role = 'pasajero'
    where session_id = p_session_id and role = 'copiloto';
  if p_user_id is not null then
    update public.session_members set role = 'copiloto'
      where session_id = p_session_id and user_id = p_user_id and status = 'dentro' and role = 'pasajero';
    if not found then raise exception 'NOT_MEMBER'; end if;
  end if;
end; $$;

create function public.set_join_mode(p_session_id uuid, p_join_mode text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(p_session_id) then raise exception 'NOT_ADMIN'; end if;
  update public.sessions set join_mode = p_join_mode where id = p_session_id;
end; $$;

create function public.leave_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.is_host(p_session_id) then raise exception 'HOST_CANNOT_LEAVE'; end if;
  update public.session_members
    set status = 'fuera', seat = null, role = 'pasajero', left_at = now()
    where session_id = p_session_id and user_id = auth.uid() and status in ('dentro', 'pendiente');
end; $$;

-- Música ----------------------------------------------------------------------
create table public.music_queue (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  spotify_track_id text not null,
  title text not null,
  artist text not null,
  album_art_url text,
  duration_ms integer not null check (duration_ms > 0),
  added_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'en_cola' check (status in ('en_cola', 'sonando', 'reproducida', 'saltada')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);
create index music_queue_sesion_estado on public.music_queue (session_id, status, created_at);
create unique index music_queue_una_sonando on public.music_queue (session_id) where status = 'sonando';

create table public.queue_votes (
  queue_id uuid not null references public.music_queue (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (queue_id, user_id)
);

-- Como mucho 3 canciones en cola por persona
create function public.check_queue_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.music_queue
      where session_id = new.session_id and added_by = new.added_by and status = 'en_cola') >= 3 then
    raise exception 'QUEUE_LIMIT';
  end if;
  return new;
end; $$;
create trigger music_queue_limite before insert on public.music_queue
  for each row execute function public.check_queue_limit();

alter table public.music_queue enable row level security;
alter table public.queue_votes enable row level security;
create policy "ver la cola" on public.music_queue for select to authenticated
  using (public.is_member(session_id));
create policy "añadir a la cola" on public.music_queue for insert to authenticated
  with check (added_by = (select auth.uid()) and status = 'en_cola' and public.is_member(session_id));
create policy "quitar mi canción" on public.music_queue for delete to authenticated
  using (added_by = (select auth.uid()) and status = 'en_cola');
create policy "el conductor avanza la cola" on public.music_queue for update to authenticated
  using (public.is_host(session_id)) with check (public.is_host(session_id));
create policy "ver votos" on public.queue_votes for select to authenticated
  using (exists (select 1 from public.music_queue q where q.id = queue_id and public.is_member(q.session_id)));

create function public.vote_skip(p_queue_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item public.music_queue;
  v_votes integer;
  v_members integer;
  v_skipped boolean := false;
begin
  select * into v_item from public.music_queue where id = p_queue_id;
  if not found or not public.is_member(v_item.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_item.status <> 'sonando' then raise exception 'NOT_PLAYING'; end if;
  insert into public.queue_votes (queue_id, user_id) values (p_queue_id, auth.uid()) on conflict do nothing;
  select count(*) into v_votes from public.queue_votes where queue_id = p_queue_id;
  select count(*) into v_members from public.session_members
    where session_id = v_item.session_id and status = 'dentro';
  if v_votes * 2 > v_members then
    update public.music_queue set status = 'saltada', ended_at = now()
      where id = p_queue_id and status = 'sonando';
    v_skipped := true;
  end if;
  return jsonb_build_object('votes', v_votes, 'needed', v_members / 2 + 1, 'skipped', v_skipped);
end; $$;

-- Viaje -----------------------------------------------------------------------
create table public.trip_points (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  lat double precision not null,
  lon double precision not null,
  accuracy_m real,
  speed_mps real,
  recorded_at timestamptz not null
);
create index trip_points_sesion_tiempo on public.trip_points (session_id, recorded_at);

create table public.trip_metrics (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  distance_m integer not null default 0 check (distance_m >= 0),
  duration_s integer not null default 0,
  start_lat double precision,
  start_lon double precision,
  last_lat double precision,
  last_lon double precision,
  end_lat double precision,
  end_lon double precision,
  updated_at timestamptz not null default now()
);

create table public.fuel_price_cache (
  cache_key text primary key,
  price_eur_l numeric(5,3) not null,
  fetched_at timestamptz not null default now()
);

alter table public.trip_points enable row level security;
alter table public.trip_metrics enable row level security;
alter table public.fuel_price_cache enable row level security;  -- sin políticas: solo la Edge Function

create policy "ver puntos" on public.trip_points for select to authenticated using (public.is_member(session_id));
create policy "el conductor guarda puntos" on public.trip_points for insert to authenticated
  with check (public.is_host(session_id));
create policy "ver métricas" on public.trip_metrics for select to authenticated using (public.is_member(session_id));
create policy "el conductor actualiza métricas" on public.trip_metrics for update to authenticated
  using (public.is_host(session_id)) with check (public.is_host(session_id));

create function public.start_trip(p_session_id uuid, p_fuel_price numeric, p_lat double precision, p_lon double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_host(p_session_id) then raise exception 'NOT_HOST'; end if;
  if p_fuel_price is null or p_fuel_price <= 0 or p_fuel_price > 5 then raise exception 'INVALID_PRICE'; end if;
  update public.sessions set status = 'en_curso', started_at = now(), fuel_price_eur_l = p_fuel_price
    where id = p_session_id and status = 'abierta';
  if not found then raise exception 'TRIP_NOT_OPEN'; end if;
  insert into public.trip_metrics (session_id, start_lat, start_lon, last_lat, last_lon)
    values (p_session_id, p_lat, p_lon, p_lat, p_lon)
    on conflict (session_id) do nothing;
end; $$;

-- Cierra el viaje (o cancela uno que no llegó a empezar). El Sprint 3 la amplía con el reparto.
create function public.end_trip(p_session_id uuid, p_distance_m integer, p_lat double precision, p_lon double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_host(p_session_id) then raise exception 'NOT_HOST'; end if;
  update public.sessions set status = 'finalizada', ended_at = now()
    where id = p_session_id and status in ('abierta', 'en_curso');
  if not found then raise exception 'TRIP_ALREADY_ENDED'; end if;
  update public.trip_metrics m
    set distance_m = greatest(m.distance_m, coalesce(p_distance_m, 0)),
        duration_s = coalesce(extract(epoch from (now() - s.started_at))::integer, 0),
        end_lat = p_lat, end_lon = p_lon, updated_at = now()
    from public.sessions s
    where m.session_id = p_session_id and s.id = p_session_id;
  update public.music_queue set status = 'reproducida', ended_at = now()
    where session_id = p_session_id and status = 'sonando';
  update public.game_rounds set status = 'cerrada'
    where session_id = p_session_id and status <> 'cerrada';
end; $$;

-- Realtime: canales privados -------------------------------------------------
-- sala:<session_id>                    → la sala (presence, broadcast y cambios de tablas). Solo miembros.
-- entrada:<session_id>:<user_id>:<x>   → la pantalla de espera de quien pide entrar. Solo esa persona.
create function public.topic_part_uuid(p_topic text, p_part integer)
returns uuid language sql immutable set search_path = '' as $$
  select case when split_part(p_topic, ':', p_part) ~ '^[0-9a-fA-F-]{36}$'
    then split_part(p_topic, ':', p_part)::uuid end;
$$;

create policy "leer el canal de mi sala" on realtime.messages for select to authenticated
  using (
    ((select realtime.topic()) like 'sala:%'
      and public.is_member(public.topic_part_uuid((select realtime.topic()), 2)))
    or ((select realtime.topic()) like 'entrada:%'
      and public.topic_part_uuid((select realtime.topic()), 3) = (select auth.uid())));
create policy "enviar al canal de mi sala" on realtime.messages for insert to authenticated
  with check ((select realtime.topic()) like 'sala:%'
    and public.is_member(public.topic_part_uuid((select realtime.topic()), 2)));

alter publication supabase_realtime add table public.music_queue, public.queue_votes, public.trip_metrics;

-- Permisos de las funciones: solo usuarios con sesión (también anónimos)
revoke execute on function public.review_join(uuid, uuid, boolean) from public, anon;
revoke execute on function public.set_copilot(uuid, uuid) from public, anon;
revoke execute on function public.set_join_mode(uuid, text) from public, anon;
revoke execute on function public.leave_session(uuid) from public, anon;
revoke execute on function public.check_queue_limit() from public, anon, authenticated;
revoke execute on function public.vote_skip(uuid) from public, anon;
revoke execute on function public.start_trip(uuid, numeric, double precision, double precision) from public, anon;
revoke execute on function public.end_trip(uuid, integer, double precision, double precision) from public, anon;
grant execute on function public.review_join(uuid, uuid, boolean) to authenticated;
grant execute on function public.set_copilot(uuid, uuid) to authenticated;
grant execute on function public.set_join_mode(uuid, text) to authenticated;
grant execute on function public.leave_session(uuid) to authenticated;
grant execute on function public.vote_skip(uuid) to authenticated;
grant execute on function public.start_trip(uuid, numeric, double precision, double precision) to authenticated;
grant execute on function public.end_trip(uuid, integer, double precision, double precision) to authenticated;
grant execute on function public.topic_part_uuid(text, integer) to authenticated;
