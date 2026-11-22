-- #48 · Trivial del camino y Cazamatrículas.
--
-- Trivial: la ronda se crea con create_round (pregunta de Wikipedia en el payload, la respuesta en
-- game_round_secrets) y reveal_round ya da 100 puntos a quien acierta. Aquí solo se comprueba que
-- la respuesta es una de las opciones.
--
-- Cazamatrículas: el reto va en el payload; cada uno escribe la matrícula que ha visto con
-- submit_plate, que comprueba el formato (1234 BCD) y el reto, y da los puntos por orden de llegada.

-- ¿La matrícula (ya normalizada, «1234BCD») cumple el reto? Igual que src/lib/games/matriculas.ts.
create function public.plate_matches(p_challenge jsonb, p_plate text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_digits text;
  v_letters text;
  v_sum integer;
begin
  if p_plate is null or p_plate !~ '^[0-9]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$' then return false; end if;
  v_digits := substr(p_plate, 1, 4);
  v_letters := substr(p_plate, 5, 3);
  case p_challenge ->> 'kind'
    when 'letras' then
      return strpos(v_letters, p_challenge -> 'letters' ->> 0) > 0 and strpos(v_letters, p_challenge -> 'letters' ->> 1) > 0;
    when 'suma' then
      select sum(d::integer) into v_sum from regexp_split_to_table(v_digits, '') as d;
      return v_sum = (p_challenge ->> 'total')::integer;
    when 'empieza' then
      return left(v_letters, 1) = p_challenge ->> 'letter' and right(v_digits, 1)::integer % 2 = 0;
    when 'repite' then
      return length(v_digits) - length(replace(v_digits, p_challenge ->> 'digit', '')) >= 2;
    else
      return false;
  end case;
end; $$;

-- Devuelve los puntos: 100, 75, 50 y 25 a los cuatro primeros, 10 al resto.
create function public.submit_plate(p_round_id uuid, p_plate text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_round public.game_rounds;
  v_plate text := upper(regexp_replace(coalesce(p_plate, ''), '[^0-9A-Za-z]', '', 'g'));
  v_position integer;
  v_points integer;
begin
  -- Bloquea la ronda: así el orden de llegada es el de verdad aunque dos respondan a la vez.
  select * into v_round from public.game_rounds where id = p_round_id for update;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_round.game <> 'matriculas' then raise exception 'WRONG_GAME'; end if;
  if v_round.status <> 'activa' or (v_round.ends_at is not null and now() > v_round.ends_at + interval '2 seconds') then
    raise exception 'ROUND_CLOSED';
  end if;
  if public.is_host(v_round.session_id) then raise exception 'DRIVER_CANT_PLAY'; end if;
  if v_plate !~ '^[0-9]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$' then raise exception 'PLATE_INVALID'; end if;
  if not public.plate_matches(v_round.payload -> 'challenge', v_plate) then raise exception 'PLATE_NO_MATCH'; end if;
  if exists (select 1 from public.game_answers where round_id = p_round_id and user_id = auth.uid()) then
    raise exception 'ALREADY_FOUND';
  end if;

  select count(*) into v_position from public.game_answers where round_id = p_round_id;
  v_points := case v_position when 0 then 100 when 1 then 75 when 2 then 50 when 3 then 25 else 10 end;
  insert into public.game_answers (round_id, user_id, answer, points)
    values (p_round_id, auth.uid(), jsonb_build_object('plate', v_plate, 'position', v_position + 1), v_points);
  return v_points;
end; $$;

-- submit_answer: las matrículas solo van por submit_plate y en el trivial la respuesta tiene que
-- ser una de las opciones. El resto, igual que en 20261118172404_turnos_dj.sql.
create or replace function public.submit_answer(p_round_id uuid, p_answer jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_round public.game_rounds;
begin
  select * into v_round from public.game_rounds where id = p_round_id;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_round.status <> 'activa' or (v_round.ends_at is not null and now() > v_round.ends_at + interval '2 seconds') then
    raise exception 'ROUND_CLOSED';
  end if;
  if v_round.game = 'matriculas' then raise exception 'WRONG_GAME'; end if;
  if v_round.game = 'trivial' and not exists (
      select 1 from jsonb_array_elements(coalesce(v_round.payload -> 'options', '[]'::jsonb)) as o
      where o ->> 'id' = p_answer ->> 'option') then
    raise exception 'INVALID_OPTION';
  end if;
  if v_round.game = 'quien_la_puso' and exists (select 1 from public.game_round_secrets
      where round_id = p_round_id and solution ->> 'option' = auth.uid()::text) then
    raise exception 'OWN_SONG';
  end if;
  if v_round.game = 'dj' then
    if public.dj_phase(p_round_id) <> 'votando' then raise exception 'VOTING_NOT_OPEN'; end if;
    if not exists (select 1 from public.music_queue
        where dj_round_id = p_round_id and id::text = p_answer ->> 'option') then
      raise exception 'INVALID_OPTION';
    end if;
    if exists (select 1 from public.music_queue
        where dj_round_id = p_round_id and id::text = p_answer ->> 'option' and added_by = auth.uid()) then
      raise exception 'OWN_SONG';
    end if;
  end if;
  insert into public.game_answers (round_id, user_id, answer) values (p_round_id, auth.uid(), p_answer)
    on conflict (round_id, user_id) do update set answer = excluded.answer, created_at = now();
end; $$;

revoke execute on function public.plate_matches(jsonb, text) from public, anon;
revoke execute on function public.submit_plate(uuid, text) from public, anon;
grant execute on function public.plate_matches(jsonb, text) to authenticated;
grant execute on function public.submit_plate(uuid, text) to authenticated;
