-- #29 · Destino del viaje para el mapa en vivo y la hora de llegada. Lo pone el conductor o el
-- copiloto (el conductor conduce: normalmente lo hará el copiloto). Sin tablas nuevas: usa las
-- columnas destination_* de sessions, que ya llegan a todos por el canal de la sala.

create function public.set_destination(p_session_id uuid, p_name text, p_lat double precision, p_lon double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(p_session_id) then raise exception 'NOT_ADMIN'; end if;
  if p_name is not null and (char_length(trim(p_name)) = 0 or char_length(p_name) > 120
      or p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180) then
    raise exception 'INVALID_DESTINATION';
  end if;
  update public.sessions
    set destination_name = nullif(trim(p_name), ''),
        destination_lat = case when p_name is null then null else p_lat end,
        destination_lon = case when p_name is null then null else p_lon end
    where id = p_session_id and status <> 'finalizada';
  if not found then raise exception 'TRIP_ALREADY_ENDED'; end if;
end; $$;
revoke execute on function public.set_destination(uuid, text, double precision, double precision) from public, anon;
grant execute on function public.set_destination(uuid, text, double precision, double precision) to authenticated;
