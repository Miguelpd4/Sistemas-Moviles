-- S1-03 · RPC para crear un viaje, ver la vista previa y entrar en él.

-- Crea el viaje del coche, o devuelve el que ya está abierto ----------------
create function public.start_session(p_car_id uuid, p_join_mode text default 'libre')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_car public.cars;
  v_profile public.profiles;
  v_session uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_car from public.cars where id = p_car_id and owner_id = v_uid;
  if not found then raise exception 'CAR_NOT_FOUND'; end if;

  select id into v_session from public.sessions where car_id = p_car_id and status <> 'finalizada';
  if found then return v_session; end if;

  select * into v_profile from public.profiles where id = v_uid;
  insert into public.sessions (car_id, host_id, join_mode, consumption_l_100km)
    values (p_car_id, v_uid, p_join_mode, v_car.consumption_l_100km)
    returning id into v_session;
  insert into public.session_members
    (session_id, user_id, role, status, seat, display_name, avatar_kind, avatar_value)
    values (v_session, v_uid, 'conductor', 'dentro', 1,
      coalesce(nullif(v_profile.display_name, ''), 'Conductor'), v_profile.avatar_kind, v_profile.avatar_value);
  return v_session;
end; $$;

-- Lo que ve el pasajero en «Estás en el coche de…» antes de entrar --------
create function public.get_session_preview(p_nfc_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select jsonb_build_object(
    'session_id', s.id,
    'status', s.status,
    'join_mode', s.join_mode,
    'car_name', c.name,
    'seats', c.seats,
    'driver_name', coalesce(nullif(p.display_name, ''), 'el conductor'),
    'taken_seats', coalesce((select jsonb_agg(m.seat order by m.seat) from public.session_members m
        where m.session_id = s.id and m.seat is not null and m.status in ('pendiente', 'dentro')), '[]'::jsonb),
    'my_status', (select m.status from public.session_members m
        where m.session_id = s.id and m.user_id = auth.uid()))
  into v
  from public.cars c
  join public.sessions s on s.car_id = c.id and s.status <> 'finalizada'
  join public.profiles p on p.id = s.host_id
  where c.nfc_code = upper(p_nfc_code);
  if v is null then raise exception 'NO_ACTIVE_SESSION'; end if;
  return v;
end; $$;

-- Entrar en la sala (o actualizar mis datos si ya estaba) ------------------
create function public.join_session(
  p_nfc_code text, p_display_name text, p_avatar_kind text, p_avatar_value text, p_seat smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_session public.sessions;
  v_seats smallint;
  v_status text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select s.* into v_session from public.sessions s join public.cars c on c.id = s.car_id
    where c.nfc_code = upper(p_nfc_code) and s.status <> 'finalizada';
  if not found then raise exception 'NO_ACTIVE_SESSION'; end if;
  if v_session.host_id = v_uid then
    return jsonb_build_object('session_id', v_session.id, 'status', 'dentro');
  end if;

  if char_length(trim(coalesce(p_display_name, ''))) not between 1 and 30 then
    raise exception 'INVALID_NAME';
  end if;
  select seats into v_seats from public.cars where id = v_session.car_id;
  if p_seat is not null and (p_seat < 2 or p_seat > v_seats) then raise exception 'INVALID_SEAT'; end if;
  if exists (select 1 from public.session_members
      where session_id = v_session.id and user_id = v_uid and status = 'rechazado') then
    raise exception 'JOIN_REJECTED';
  end if;

  v_status := case when v_session.join_mode = 'aprobacion' then 'pendiente' else 'dentro' end;
  insert into public.session_members as m
    (session_id, user_id, role, status, seat, display_name, avatar_kind, avatar_value)
  values (v_session.id, v_uid, 'pasajero', v_status, p_seat, trim(p_display_name), p_avatar_kind, p_avatar_value)
  on conflict (session_id, user_id) do update
    set seat = excluded.seat,
        display_name = excluded.display_name,
        avatar_kind = excluded.avatar_kind,
        avatar_value = excluded.avatar_value,
        status = case when m.status = 'dentro' then 'dentro' else excluded.status end,
        left_at = null
  returning m.status into v_status;

  update public.profiles
    set display_name = trim(p_display_name), avatar_kind = p_avatar_kind, avatar_value = p_avatar_value
    where id = v_uid;
  return jsonb_build_object('session_id', v_session.id, 'status', v_status);
exception
  when unique_violation then raise exception 'SEAT_TAKEN';
end; $$;

-- Permisos: solo usuarios con sesión (anónimos incluidos) ----------------
revoke execute on function public.start_session(uuid, text) from public, anon;
revoke execute on function public.get_session_preview(text) from public, anon;
revoke execute on function public.join_session(text, text, text, text, smallint) from public, anon;
grant execute on function public.start_session(uuid, text) to authenticated;
grant execute on function public.get_session_preview(text) to authenticated;
grant execute on function public.join_session(text, text, text, text, smallint) to authenticated;
