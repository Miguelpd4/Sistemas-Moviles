-- #48 · Bingo de carretera.
--
-- Quien empieza la ronda reparte un cartón de 3×3 a cada pasajero (en el payload:
-- { cards: { <user_id>: [9 casillas] } }; las casillas salen de src/lib/games/bingo.ts).
-- Cada uno marca lo que ve con bingo_mark: las marcas no se quitan. La primera línea de cada
-- uno da 30, 20 o 10 puntos según quién la cante antes; el primer cartón completo da 100 más
-- y termina la ronda para todos.

create function public.bingo_mark(p_round_id uuid, p_item text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_round public.game_rounds;
  v_card jsonb;
  v_answer jsonb;
  v_points integer;
  v_marked jsonb;
  v_lines integer := 0;
  v_line_rank integer;
  v_full boolean;
  v_line integer[];
  v_all_lines constant integer[] := array[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
begin
  -- Bloquea la ronda: así el orden de las líneas es el de verdad aunque dos canten a la vez.
  select * into v_round from public.game_rounds where id = p_round_id for update;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_round.game <> 'bingo' then raise exception 'WRONG_GAME'; end if;
  if v_round.status <> 'activa' or (v_round.ends_at is not null and now() > v_round.ends_at + interval '2 seconds') then
    raise exception 'ROUND_CLOSED';
  end if;
  if public.is_host(v_round.session_id) then raise exception 'DRIVER_CANT_PLAY'; end if;
  v_card := v_round.payload -> 'cards' -> (auth.uid()::text);
  if v_card is null or jsonb_typeof(v_card) <> 'array' or jsonb_array_length(v_card) <> 9 then
    raise exception 'NO_CARD';
  end if;
  if not (v_card ? p_item) then raise exception 'INVALID_OPTION'; end if;

  select answer, points into v_answer, v_points from public.game_answers
    where round_id = p_round_id and user_id = auth.uid();
  v_points := coalesce(v_points, 0);
  v_marked := coalesce(v_answer -> 'marked', '[]'::jsonb);
  if not (v_marked ? p_item) then v_marked := v_marked || to_jsonb(p_item); end if;

  foreach v_line slice 1 in array v_all_lines loop
    if v_marked ? (v_card ->> v_line[1]) and v_marked ? (v_card ->> v_line[2]) and v_marked ? (v_card ->> v_line[3]) then
      v_lines := v_lines + 1;
    end if;
  end loop;
  select bool_and(v_marked ? item) into v_full from jsonb_array_elements_text(v_card) as item;

  v_line_rank := (v_answer ->> 'line')::integer;
  if v_lines > 0 and v_line_rank is null then
    select count(*) + 1 into v_line_rank from public.game_answers
      where round_id = p_round_id and answer ? 'line';
    v_points := v_points + case v_line_rank when 1 then 30 when 2 then 20 else 10 end;
  end if;
  if v_full then
    v_points := v_points + 100;
    update public.game_rounds set status = 'revelada' where id = p_round_id;
  end if;

  v_answer := jsonb_strip_nulls(jsonb_build_object(
    'marked', v_marked, 'line', v_line_rank, 'bingo', case when v_full then true end));
  insert into public.game_answers (round_id, user_id, answer, points) values (p_round_id, auth.uid(), v_answer, v_points)
    on conflict (round_id, user_id) do update set answer = excluded.answer, points = excluded.points;
  return jsonb_build_object('lines', v_lines, 'line', v_line_rank, 'bingo', v_full, 'points', v_points);
end; $$;

-- submit_answer: el bingo solo va por bingo_mark. El resto, igual que en 20261122144044_juegos_camino.sql.
create or replace function public.submit_answer(p_round_id uuid, p_answer jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_round public.game_rounds;
begin
  select * into v_round from public.game_rounds where id = p_round_id;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_round.status <> 'activa' or (v_round.ends_at is not null and now() > v_round.ends_at + interval '2 seconds') then
    raise exception 'ROUND_CLOSED';
  end if;
  if v_round.game in ('matriculas', 'bingo') then raise exception 'WRONG_GAME'; end if;
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

revoke execute on function public.bingo_mark(uuid, text) from public, anon;
grant execute on function public.bingo_mark(uuid, text) to authenticated;
